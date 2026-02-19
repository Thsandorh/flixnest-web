#!/usr/bin/env node

// Copyright (C) 2017-2023 Smart code 203358507

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const profilesRouter = require('./routes/profiles');
const authRouter = require('./routes/auth');

const INDEX_CACHE = 7200;
const ASSETS_CACHE = 2629744;
const HTTP_PORT = process.env.PORT || 8080;

function normalizeBasePath(rawBasePath) {
    if (!rawBasePath || rawBasePath === '/') {
        return '';
    }
    const trimmed = String(rawBasePath).trim();
    const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return withLeadingSlash.replace(/\/+$/, '');
}

function escapeForRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const BASE_PATH = normalizeBasePath(process.env.BASE_PATH);
const API_BASE_PATH = `${BASE_PATH}/api`;
const BOOTSTRAP_BASE_PATH = JSON.stringify(BASE_PATH || '');
const INDEX_BOOTSTRAP_FIX_SCRIPT = [
    '<script>',
    '(function(){',
    `window.__STREMIO_BASE_PATH__ = ${BOOTSTRAP_BASE_PATH};`,
    'function normalizeProfileRaw(raw) {',
    '  try {',
    '    var parsed = JSON.parse(raw || "{}");',
    '    if (!parsed || typeof parsed !== "object") return raw;',
    '    if ("profileInfo" in parsed) delete parsed.profileInfo;',
    '    if (!Array.isArray(parsed.addons)) parsed.addons = [];',
    '    if (parsed.auth && typeof parsed.auth === "object") {',
    '      var key = typeof parsed.auth.key === "string" ? parsed.auth.key : (typeof parsed.auth.authKey === "string" ? parsed.auth.authKey : null);',
    '      var user = parsed.auth.user && typeof parsed.auth.user === "object" ? parsed.auth.user : null;',
    '      parsed.auth = key && user ? { key: key, user: user } : null;',
    '    } else {',
    '      parsed.auth = null;',
    '    }',
    '    return JSON.stringify(parsed);',
    '  } catch (_) {',
    '    return raw;',
    '  }',
    '}',
    'try {',
    '  var originalSetItem = window.localStorage.setItem.bind(window.localStorage);',
    '  window.localStorage.setItem = function(key, value) {',
    '    if (key === "profile" && typeof value === "string") {',
    '      value = normalizeProfileRaw(value);',
    '    }',
    '    return originalSetItem(key, value);',
    '  };',
    '  var raw = window.localStorage.getItem("profile");',
    '  if (raw) window.localStorage.setItem("profile", normalizeProfileRaw(raw));',
    '} catch (_) {}',
    '})();',
    '</script>'
].join('');

// Validate ENCRYPTION_KEY
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
    console.error('ERROR: ENCRYPTION_KEY must be exactly 32 characters long');
    console.error('Please set it in your .env file');
    process.exit(1);
}

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers for API
app.use(API_BASE_PATH, (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Profile-Scope');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// API Routes
app.use(`${API_BASE_PATH}/profiles`, profilesRouter);
app.use(`${API_BASE_PATH}/auth`, authRouter);

// Static files (Stremio Web build)
const build_path = path.resolve(__dirname, '../build');
const index_path = path.join(build_path, 'index.html');

async function serveIndex(res) {
    try {
        const html = await fs.readFile(index_path, 'utf8');
        const patchedHtml = html.includes('</head>')
            ? html.replace('</head>', `${INDEX_BOOTSTRAP_FIX_SCRIPT}</head>`)
            : `${INDEX_BOOTSTRAP_FIX_SCRIPT}${html}`;
        res.set('cache-control', 'no-store, no-cache, must-revalidate');
        res.type('html').send(patchedHtml);
    } catch (error) {
        console.error('Failed to serve index.html:', error);
        res.status(500).send('Internal server error');
    }
}

const staticMiddleware = express.static(build_path, {
    setHeaders: (res, filePath) => {
        if (filePath === index_path) {
            res.set('cache-control', `public, max-age: ${INDEX_CACHE}`);
        } else {
            res.set('cache-control', `public, max-age: ${ASSETS_CACHE}`);
        }
    }
});

if (BASE_PATH) {
    app.get(`${BASE_PATH}/`, (req, res) => {
        serveIndex(res);
    });
    app.use(BASE_PATH, staticMiddleware);
    app.get('/', (req, res) => {
        res.redirect(`${BASE_PATH}/`);
    });
} else {
    app.get('/', (req, res) => {
        serveIndex(res);
    });
    app.use(staticMiddleware);
}

// SPA fallback - serve index.html for all other routes
if (BASE_PATH) {
    const basePathRegexp = new RegExp(`^${escapeForRegex(BASE_PATH)}(?:/.*)?$`);
    app.get(basePathRegexp, (req, res) => {
        serveIndex(res);
    });
} else {
    app.get('*', (req, res) => {
        serveIndex(res);
    });
}

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(HTTP_PORT, () => {
    console.info(`Stremio Profile Switcher server listening on port: ${HTTP_PORT}`);
    console.info(`Serving static files from: ${build_path}`);
    console.info(`Base path: ${BASE_PATH || '/'}`);
    console.info(`Encryption enabled with key length: ${process.env.ENCRYPTION_KEY.length} chars`);
});

