// Copyright (C) 2017-2023 Smart code 203358507

const PROFILE_SCOPE_STORAGE_KEY = 'profileScopeId';
const { safeGetItem, safeSetItem } = require('stremio/common/safeStorage');

function generateScopeId() {
    if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID().replace(/-/g, '');
    }

    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function getOrCreateProfileScopeId() {
    const existing = safeGetItem(PROFILE_SCOPE_STORAGE_KEY);
    if (typeof existing === 'string') {
        const trimmed = existing.trim();
        if (/^[A-Za-z0-9_-]{8,128}$/.test(trimmed)) {
            return trimmed;
        }
    }

    const created = generateScopeId();
    safeSetItem(PROFILE_SCOPE_STORAGE_KEY, created);
    return created;
}

function buildScopedHeaders(rawHeaders) {
    const headers = new Headers(rawHeaders || {});
    headers.set('X-Profile-Scope', getOrCreateProfileScopeId());
    return headers;
}

async function scopedFetch(url, init) {
    const requestInit = {
        ...(init || {}),
        headers: buildScopedHeaders(init && init.headers ? init.headers : undefined)
    };

    return fetch(url, requestInit);
}

module.exports = {
    scopedFetch,
    getOrCreateProfileScopeId
};
