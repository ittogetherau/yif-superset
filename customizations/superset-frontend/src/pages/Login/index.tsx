/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useState, useEffect, useMemo } from 'react';
import { t } from '@apache-superset/core';
import { SupersetClient } from '@superset-ui/core';
import { capitalize } from 'lodash/fp';
import { addDangerToast } from 'src/components/MessageToasts/actions';
import { useDispatch } from 'react-redux';
import getBootstrapData from 'src/utils/getBootstrapData';

type OAuthProvider = {
  name: string;
  icon: string;
};

type OIDProvider = {
  name: string;
  url: string;
};

type Provider = OAuthProvider | OIDProvider;

enum AuthType {
  AuthOID = 0,
  AuthDB = 1,
  AuthLDAP = 2,
  AuthOauth = 4,
}

const BRAND_LOGOS = [
  {
    src: 'https://cdn.prod.website-files.com/67c6bb4c078fa10ae705cd84/67c6dcc31cbb93606401d200_Burn-Bright-1.png',
    name: 'Burn Bright',
  },
  {
    src: 'https://cdn.prod.website-files.com/67c6bb4c078fa10ae705cd84/67cfbca72b2426a1e2d09205_Ignite%20Camp%20Logo%20LIGHT%20GREEN.png',
    name: 'Ignite Camp',
  },
  {
    src: 'https://cdn.prod.website-files.com/67c6bb4c078fa10ae705cd84/67cfbcc2b82d265a60411bf2_InnerFit-LogoFamily-RGB-01.png',
    name: 'InnerFit',
  },
  {
    src: 'https://cdn.prod.website-files.com/67c6bb4c078fa10ae705cd84/67c6dd6de67bc20c395f5804_attitude.png',
    name: 'Attitude',
  },
  {
    src: 'https://cdn.prod.website-files.com/67c6bb4c078fa10ae705cd84/67c6dce8af458257a1005252_65d4158b62e67510900fc459_YLLA-04-p-800.png',
    name: 'YLLA',
  },
  {
    src: 'https://cdn.prod.website-files.com/67c6bb4c078fa10ae705cd84/67c6ddbda8efec5443309449_6052c342855445473d5753b5_NLF%20Logo%20Border.png',
    name: 'NLF',
  },
  {
    src: 'https://cdn.prod.website-files.com/67c6bb4c078fa10ae705cd84/67c6ddb98a6a5dbe5426b6c8_YEP%2Blogo.png',
    name: 'YEP',
  },
  {
    src: 'https://cdn.prod.website-files.com/67c6bb4c078fa10ae705cd84/67c6de012e593541d4bfef56_2021-25-06T07-25-59_foundation-logo-toned-1.png',
    name: 'Foundation',
  },
];

const STATS = [
  { number: '50K+', label: 'Young lives impacted' },
  { number: '8', label: 'Programs delivered' },
  { number: '200+', label: 'Partner schools' },
  { number: '95%', label: 'Positive outcomes' },
];

const LOGIN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap');

  @keyframes yif-fade-down {
    from { opacity: 0; transform: translateY(-16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes yif-fade-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes yif-scale-in {
    from { opacity: 0; transform: scale(0.88); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes yif-orbit-spin {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to   { transform: translate(-50%, -50%) rotate(360deg); }
  }
  @keyframes yif-scroll-left {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes yif-shimmer {
    0%, 100% { left: -100%; }
    50%       { left: 100%; }
  }

  .yif-anim-fade-down   { animation: yif-fade-down  0.8s ease both; }
  .yif-anim-fade-down-1 { animation: yif-fade-down  0.8s 0.15s ease both; }
  .yif-anim-fade-down-2 { animation: yif-fade-down  0.8s 0.3s  ease both; }
  .yif-anim-fade-up     { animation: yif-fade-up    0.8s 0.7s  ease both; }
  .yif-anim-fade-up-2   { animation: yif-fade-up    0.8s 1s    ease both; }
  .yif-anim-scale-in    { animation: yif-scale-in   0.7s 0.5s  ease both; }
  .yif-anim-orbit       { animation: yif-orbit-spin 60s linear infinite; }
  .yif-anim-scroll      { animation: yif-scroll-left 35s linear infinite; }
  .yif-anim-scroll:hover { animation-play-state: paused; }

  .yif-scroll-track {
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0%, black 12%, black 88%, transparent 100%);
  }

  .yif-input {
    width: 100%;
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 14px;
    font-family: 'DM Sans', sans-serif;
    outline: none;
    transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    color: #fff;
    box-sizing: border-box;
  }
  .yif-input::placeholder { color: rgba(255,255,255,0.25); }
  .yif-input:focus {
    border-color: #ff8360;
    background: rgba(255, 131, 96, 0.04);
    box-shadow: 0 0 0 3px rgba(255, 131, 96, 0.08);
  }
  .yif-input-pw { padding-right: 48px; }

  .yif-btn-shimmer {
    position: absolute;
    top: 0; left: -100%;
    width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
    animation: yif-shimmer 3s ease-in-out infinite;
    pointer-events: none;
  }

  @media (max-width: 900px) {
    .yif-layout { flex-direction: column !important; overflow-y: auto; }
    .yif-left   { min-height: 50vh; flex: none !important; }
    .yif-right  { flex: none !important; min-height: 50vh; }
  }
`;

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeStatIndex, setActiveStatIndex] = useState(0);
  const dispatch = useDispatch();

  const bootstrapData = getBootstrapData();

  const nextUrl = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('next') || '';
    } catch (_error) {
      return '';
    }
  }, []);

  const loginEndpoint = useMemo(
    () => (nextUrl ? `/login/?next=${encodeURIComponent(nextUrl)}` : '/login/'),
    [nextUrl],
  );

  const buildProviderLoginUrl = (providerName: string) => {
    const base = `/login/${providerName}`;
    return nextUrl
      ? `${base}${base.includes('?') ? '&' : '?'}next=${encodeURIComponent(nextUrl)}`
      : base;
  };

  const authType: AuthType = bootstrapData.common.conf.AUTH_TYPE;
  const providers: Provider[] = bootstrapData.common.conf.AUTH_PROVIDERS;
  const authRegistration: boolean = bootstrapData.common.conf.AUTH_USER_REGISTRATION;

  // TODO: Temporary login error detection via sessionStorage.
  // Replace when Flask-AppBuilder supports JSON login responses.
  useEffect(() => {
    const loginAttempted = sessionStorage.getItem('login_attempted');
    if (loginAttempted === 'true') {
      sessionStorage.removeItem('login_attempted');
      dispatch(addDangerToast(t('Invalid username or password')));
      setPassword('');
    }
  }, [dispatch]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStatIndex(prev => (prev + 1) % STATS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    sessionStorage.setItem('login_attempted', 'true');
    const formData: Record<string, string> = { username, password };
    if (rememberMe) formData.remember_me = 'y';
    SupersetClient.postForm(loginEndpoint, formData, '');
  };

  return (
    <div
      className="yif-layout"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        overflowX: 'hidden',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: LOGIN_STYLES }} />

      {/* ── LEFT PANEL ── */}
      <div
        className="yif-left"
        style={{
          flex: '1 1 55%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px',
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(165deg, #0f1f30 0%, #1a2f47 40%, #2b4a65 70%, #0f1f30 100%)',
        }}
      >
        {/* Decorative orbs */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-80px',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,131,96,0.09) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-60px',
            width: '360px',
            height: '360px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,170,143,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Orbit rings */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '560px',
            height: '560px',
            borderRadius: '50%',
            border: '1px solid rgba(255,131,96,0.05)',
            pointerEvents: 'none',
          }}
        />
        <div
          className="yif-anim-orbit"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            border: '1px dashed rgba(255,131,96,0.04)',
            pointerEvents: 'none',
          }}
        />

        {/* Heading */}
        <div>
          <h1
            className="yif-anim-fade-down-1"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 'clamp(2rem, 3.5vw, 3.2rem)',
              lineHeight: 1.08,
              marginBottom: '24px',
              maxWidth: '500px',
            }}
          >
            <span style={{ color: '#ffffff' }}>{t('Measuring the')}</span>
            <span
              style={{
                display: 'block',
                backgroundImage:
                  'linear-gradient(135deg, #ff8360 0%, #ffaa8f 45%, #ffcc99 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
              }}
            >
              {t('impact that matters')}
            </span>
          </h1>
          <p
            className="yif-anim-fade-down-2"
            style={{
              fontSize: '16px',
              lineHeight: 1.7,
              maxWidth: '420px',
              color: 'rgba(255,255,255,0.55)',
              margin: 0,
            }}
          >
            {t(
              'Track, measure, and report on the real-world outcomes of youth programs across all our brands.',
            )}
          </p>
        </div>

        {/* Logo showcase */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '40px',
            padding: '16px 0',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <div
            className="yif-anim-scale-in"
            style={{
              borderRadius: '20px',
              padding: '24px 40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            <img
              src="https://cdn.prod.website-files.com/67c6bb4c078fa10ae705cd84/67c6be45eeb6136ba9065524_YIF%20-%20Landscape-p-500.png"
              alt="The Youth Impact Foundation"
              style={{ height: '54px', width: 'auto' }}
            />
          </div>

          {/* Scrolling brand logos */}
          <div
            className="yif-anim-fade-up yif-scroll-track"
            style={{ width: '100%', overflow: 'hidden' }}
          >
            <div
              className="yif-anim-scroll"
              style={{ display: 'flex', gap: '20px', width: 'max-content' }}
            >
              {[...BRAND_LOGOS, ...BRAND_LOGOS].map((logo, index) => (
                <div
                  // index is stable for a static doubled array
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  style={{
                    flexShrink: 0,
                    width: '140px',
                    height: '68px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
                    transition: 'all 0.35s',
                    background:
                      logo.name === 'Attitude'
                        ? 'rgba(43,87,130,0.3)'
                        : 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = 'rgba(255,131,96,0.6)';
                    el.style.background =
                      logo.name === 'Attitude'
                        ? 'rgba(43,87,130,0.5)'
                        : '#ffffff';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.borderColor = 'rgba(255,255,255,0.3)';
                    el.style.background =
                      logo.name === 'Attitude'
                        ? 'rgba(43,87,130,0.3)'
                        : 'rgba(255,255,255,0.95)';
                  }}
                >
                  <img
                    src={logo.src}
                    alt={logo.name}
                    loading="lazy"
                    style={{
                      maxHeight: '42px',
                      maxWidth: '112px',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                    }}
                    onError={e => {
                      const parent = (e.currentTarget as HTMLImageElement)
                        .parentElement;
                      if (parent) parent.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div
          className="yif-anim-fade-up-2"
          style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}
        >
          {STATS.map((stat, index) => (
            <div key={stat.number} style={{ minWidth: '90px' }}>
              <div
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  lineHeight: 1,
                  transition: 'all 0.5s',
                  fontSize: activeStatIndex === index ? '2.1rem' : '1.5rem',
                  color:
                    activeStatIndex === index
                      ? '#ffaa8f'
                      : 'rgba(255,255,255,0.55)',
                }}
              >
                {stat.number}
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  marginTop: '6px',
                  letterSpacing: '0.3px',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        className="yif-right"
        style={{
          flex: '1 1 45%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
          position: 'relative',
          background: '#1e3a57',
        }}
      >
        {/* Left border accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '1px',
            background:
              'linear-gradient(180deg, transparent 10%, rgba(255,131,96,0.2) 50%, transparent 90%)',
          }}
        />

        <div
          className="yif-anim-fade-down-2"
          style={{ width: '100%', maxWidth: '380px' }}
          data-test="login-form"
        >
          <h2
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: '1.65rem',
              color: '#ffffff',
              margin: '0 0 8px 0',
            }}
          >
            {t('Welcome back')}
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.4)',
              margin: '0 0 36px 0',
            }}
          >
            {t('Sign in to your impact dashboard')}
          </p>

          {/* ── DB / LDAP form ── */}
          {(authType === AuthType.AuthDB || authType === AuthType.AuthLDAP) && (
            <form onSubmit={onSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    marginBottom: '6px',
                    letterSpacing: '0.4px',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  {t('Email address')}
                </label>
                <input
                  type="text"
                  name="username"
                  placeholder="you@organisation.org.au"
                  autoComplete="username"
                  autoFocus
                  required
                  className="yif-input"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  data-test="username-input"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    marginBottom: '6px',
                    letterSpacing: '0.4px',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  {t('Password')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder={t('Enter your password')}
                    autoComplete="current-password"
                    required
                    className="yif-input yif-input-pw"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    data-test="password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={t('Toggle password visibility')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      color: 'rgba(255,255,255,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      lineHeight: 0,
                    }}
                    onMouseEnter={e =>
                      (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')
                    }
                    onMouseLeave={e =>
                      (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')
                    }
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      {showPassword ? (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '28px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{
                      width: '15px',
                      height: '15px',
                      cursor: 'pointer',
                      accentColor: '#ff8360',
                    }}
                  />
                  {t('Remember me')}
                </label>
                <a
                  href="/resetmypassword/"
                  style={{
                    fontSize: '14px',
                    color: '#ffaa8f',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e =>
                    (e.currentTarget.style.textDecoration = 'underline')
                  }
                  onMouseLeave={e =>
                    (e.currentTarget.style.textDecoration = 'none')
                  }
                >
                  {t('Forgot password?')}
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                data-test="login-button"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '14px',
                  letterSpacing: '0.3px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #ff8360, #ff5d3a)',
                  border: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: loading ? 0.8 : 1,
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow =
                      '0 6px 24px rgba(255,131,96,0.3)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span className="yif-btn-shimmer" />
                <span style={{ position: 'relative', zIndex: 1 }}>
                  {loading ? t('Signing in…') : t('Sign in')}
                </span>
              </button>

              {authRegistration && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <a
                    href="/register/"
                    style={{ fontSize: '14px', color: '#ffaa8f', textDecoration: 'none' }}
                    onMouseEnter={e =>
                      (e.currentTarget.style.textDecoration = 'underline')
                    }
                    onMouseLeave={e =>
                      (e.currentTarget.style.textDecoration = 'none')
                    }
                  >
                    {t("Don't have an account? Register")}
                  </a>
                </div>
              )}
            </form>
          )}

          {/* ── OAuth / OID provider buttons ── */}
          {(authType === AuthType.AuthOauth || authType === AuthType.AuthOID) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {providers.map((provider: Provider) => (
                <a
                  key={provider.name}
                  href={buildProviderLoginUrl(provider.name)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#ffffff',
                    textDecoration: 'none',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    transition: 'background 0.2s, border-color 0.2s',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                    e.currentTarget.style.borderColor = 'rgba(255,131,96,0.5)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.borderColor =
                      'rgba(255,255,255,0.15)';
                  }}
                >
                  {t('Sign in with')} {capitalize(provider.name)}
                </a>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: '48px',
              paddingTop: '24px',
              textAlign: 'center',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p
              style={{
                fontSize: '11px',
                lineHeight: 1.7,
                color: 'rgba(255,255,255,0.25)',
                margin: 0,
              }}
            >
              {t('The Youth Impact Foundation © 2026. All rights reserved')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
