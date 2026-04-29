ARG SUPERSET_REF=f6f96ecc49c0b5179396730f75261c7d666b1062
ARG PY_VER=3.11.14-slim-trixie
ARG BUILDPLATFORM=${BUILDPLATFORM:-amd64}
ARG BUILD_TRANSLATIONS="false"

######################################################################
# Fetch Superset source at pinned commit
######################################################################
FROM alpine/git AS superset-source
ARG SUPERSET_REF
RUN git clone https://github.com/apache/superset.git /superset && \
    cd /superset && git checkout ${SUPERSET_REF}

# Apply YIF customisations on top of the pinned source
COPY customizations/ /superset/

######################################################################
# Node build stage
######################################################################
FROM --platform=${BUILDPLATFORM} node:20-trixie-slim AS superset-node-ci
ARG BUILD_TRANSLATIONS
ENV BUILD_TRANSLATIONS=${BUILD_TRANSLATIONS}
ARG DEV_MODE="false"
ENV DEV_MODE=${DEV_MODE}

COPY --from=superset-source /superset/docker/ /app/docker/
RUN /app/docker/apt-install.sh build-essential python3 zstd

ENV BUILD_CMD=build \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN /app/docker/frontend-mem-nag.sh

WORKDIR /app/superset-frontend

RUN mkdir -p /app/superset/static/assets /app/superset/translations

RUN --mount=type=bind,from=superset-source,source=/superset/superset-frontend/package.json,target=./package.json \
    --mount=type=bind,from=superset-source,source=/superset/superset-frontend/package-lock.json,target=./package-lock.json \
    --mount=type=cache,target=/root/.cache \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY --from=superset-source /superset/superset-frontend /app/superset-frontend

FROM superset-node-ci AS superset-node
RUN --mount=type=cache,target=/root/.npm \
    npm run build

COPY --from=superset-source /superset/superset/translations /app/superset/translations
RUN if [ "${BUILD_TRANSLATIONS}" = "true" ]; then \
        npm run build-translation; \
    fi; \
    rm -rf /app/superset/translations/*/*/*.[po,mo]

######################################################################
# Python base
######################################################################
FROM python:${PY_VER} AS python-base

ARG SUPERSET_HOME="/app/superset_home"
ENV SUPERSET_HOME=${SUPERSET_HOME}

RUN mkdir -p ${SUPERSET_HOME}
RUN useradd --user-group -d ${SUPERSET_HOME} -m --no-log-init --shell /bin/bash superset \
    && chmod -R 1777 ${SUPERSET_HOME} \
    && chown -R superset:superset ${SUPERSET_HOME}

COPY --from=superset-source --chmod=755 /superset/docker/*.sh /app/docker/

RUN pip install --no-cache-dir --upgrade uv
RUN uv venv /app/.venv
ENV PATH="/app/.venv/bin:${PATH}"

######################################################################
# Python translation compiler
######################################################################
FROM python-base AS python-translation-compiler
ARG BUILD_TRANSLATIONS
ENV BUILD_TRANSLATIONS=${BUILD_TRANSLATIONS}

COPY --from=superset-source /superset/requirements/translations.txt requirements/
RUN --mount=type=cache,target=/root/.cache/uv \
    . /app/.venv/bin/activate && /app/docker/pip-install.sh --requires-build-essential -r requirements/translations.txt

COPY --from=superset-source /superset/superset/translations/ /app/translations_mo/
RUN if [ "${BUILD_TRANSLATIONS}" = "true" ]; then \
        pybabel compile -d /app/translations_mo | true; \
    fi; \
    rm -f /app/translations_mo/*/*/*.[po,json]

######################################################################
# Python app layer
######################################################################
FROM python-base AS python-common

ENV SUPERSET_HOME="/app/superset_home" \
    HOME="/app/superset_home" \
    SUPERSET_ENV="production" \
    FLASK_APP="superset.app:create_app()" \
    PYTHONPATH="/app/pythonpath" \
    SUPERSET_PORT="8088"

COPY --from=superset-source --chmod=755 /superset/docker/entrypoints /app/docker/entrypoints

WORKDIR /app
RUN mkdir -p ${PYTHONPATH} superset/static requirements superset-frontend \
             apache_superset.egg-info \
    && touch superset/static/version_info.json

ENV PLAYWRIGHT_BROWSERS_PATH=/usr/local/share/playwright-browsers

COPY --from=superset-source /superset/pyproject.toml /superset/setup.py /superset/MANIFEST.in /superset/README.md ./
COPY --from=superset-source /superset/superset-frontend/package.json superset-frontend/
COPY --from=superset-source /superset/scripts/check-env.py scripts/

COPY --chmod=755 --from=superset-source /superset/docker/entrypoints/run-server.sh /usr/bin/

RUN /app/docker/apt-install.sh \
      curl libsasl2-dev libsasl2-modules-gssapi-mit \
      libpq-dev libecpg-dev libldap2-dev

RUN mkdir -p /app/data && chown -R superset:superset /app/data

COPY --from=superset-node /app/superset/static/assets superset/static/assets

COPY --from=superset-source /superset/superset superset
RUN rm superset/translations/*/*/*.po

COPY --from=superset-node /app/superset/translations superset/translations
COPY --from=python-translation-compiler /app/translations_mo superset/translations

HEALTHCHECK CMD /app/docker/docker-healthcheck.sh
CMD ["/app/docker/entrypoints/run-server.sh"]
EXPOSE ${SUPERSET_PORT}

######################################################################
# Final production image
######################################################################
FROM python-common AS lean

COPY --from=superset-source /superset/requirements/base.txt requirements/
COPY --from=superset-source /superset/superset-core superset-core

RUN --mount=type=cache,target=${SUPERSET_HOME}/.cache/uv \
    /app/docker/pip-install.sh --requires-build-essential -r requirements/base.txt
RUN --mount=type=cache,target=${SUPERSET_HOME}/.cache/uv \
    uv pip install -e .
RUN python -m compileall /app/superset

USER superset
