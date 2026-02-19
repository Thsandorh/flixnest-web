// Copyright (C) 2017-2023 Smart code 203358507

if (typeof process.env.SENTRY_DSN === 'string') {
    const Sentry = require('@sentry/browser');
    Sentry.init({ dsn: process.env.SENTRY_DSN });
}

const Bowser = require('bowser');
const browser = Bowser.parse(window.navigator?.userAgent || '');
if (browser?.platform?.type === 'desktop') {
    document.querySelector('meta[name="viewport"]')?.setAttribute('content', '');
}

const React = require('react');
const ReactDOM = require('react-dom/client');
const i18n = require('i18next');
const { initReactI18next } = require('react-i18next');
const stremioTranslations = require('stremio-translations');
const profileSwitcherKeys = require('./i18n/profileSwitcher.json');

function normalizeProfileRaw(rawProfile) {
    if (typeof rawProfile !== 'string' || rawProfile.length === 0) {
        return rawProfile;
    }
    try {
        const parsed = JSON.parse(rawProfile);
        if (!parsed || typeof parsed !== 'object') {
            return rawProfile;
        }
        if ('profileInfo' in parsed) {
            delete parsed.profileInfo;
        }
        if (!Array.isArray(parsed.addons)) {
            parsed.addons = [];
        }
        if (parsed.auth !== null && typeof parsed.auth === 'object') {
            const key = typeof parsed.auth.key === 'string'
                ? parsed.auth.key
                : typeof parsed.auth.authKey === 'string'
                    ? parsed.auth.authKey
                    : null;
            const user = parsed.auth.user && typeof parsed.auth.user === 'object' ? parsed.auth.user : null;

            parsed.auth = key
                && user
                ? {
                    key,
                    user
                }
                : null;
        } else {
            parsed.auth = null;
        }
        return JSON.stringify(parsed);
    } catch (_) {
        return rawProfile;
    }
}

function normalizeStoredProfileNow() {
    try {
        const rawProfile = window.localStorage.getItem('profile');
        if (typeof rawProfile === 'string') {
            const normalized = normalizeProfileRaw(rawProfile);
            if (normalized !== rawProfile) {
                window.localStorage.setItem('profile', normalized);
            }
        }
    } catch (_) {
        // Ignore malformed localStorage values.
    }
}

normalizeStoredProfileNow();

// Ensure any future read/write for "profile" is normalized before core touches it.
try {
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    const originalGetItem = window.localStorage.getItem.bind(window.localStorage);

    window.localStorage.setItem = (key, value) => {
        if (key === 'profile' && typeof value === 'string') {
            return originalSetItem(key, normalizeProfileRaw(value));
        }
        return originalSetItem(key, value);
    };

    window.localStorage.getItem = (key) => {
        const value = originalGetItem(key);
        if (key !== 'profile' || typeof value !== 'string') {
            return value;
        }
        const normalized = normalizeProfileRaw(value);
        if (normalized !== value) {
            originalSetItem(key, normalized);
        }
        return normalized;
    };

    normalizeStoredProfileNow();
} catch (_) {
    // Browsers may forbid overriding storage methods; keep startup normalization only.
}

const App = require('./App');

const translations = Object.fromEntries(Object.entries(stremioTranslations()).map(([key, value]) => [key, {
    translation: { ...value, ...profileSwitcherKeys }
}]));

i18n
    .use(initReactI18next)
    .init({
        resources: translations,
        lng: 'en-US',
        fallbackLng: 'en-US',
        interpolation: {
            escapeValue: false
        }
    });

const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(<App />);

if (process.env.NODE_ENV === 'production' && process.env.SERVICE_WORKER_DISABLED !== 'true' && process.env.SERVICE_WORKER_DISABLED !== true && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .catch((registrationError) => {
                const message = registrationError && registrationError.message ? registrationError.message : String(registrationError);
                if (message.includes('user denied permission to use Service Worker')) {
                    return;
                }
                console.error('SW registration failed: ', registrationError);
            });
    });
}

