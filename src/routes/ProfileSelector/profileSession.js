// Copyright (C) 2017-2023 Smart code 203358507

const PROFILE_STORAGE_KEY = 'profile';
const ACTIVE_PROFILE_ID_STORAGE_KEY = 'activeProfileId';
const { safeGetItem, safeSetItem, safeRemoveItem } = require('stremio/common/safeStorage');

function parseJsonSafe(raw) {
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
        return null;
    }
}

function normalizeAuth(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    if (payload.auth && typeof payload.auth === 'object') {
        const keyFromAuth = typeof payload.auth.key === 'string' ? payload.auth.key.trim() : '';
        const userFromAuth = payload.auth.user && typeof payload.auth.user === 'object' ? payload.auth.user : null;
        if (keyFromAuth) {
            return {
                key: keyFromAuth,
                user: userFromAuth
            };
        }
    }

    const keyFromPayload = typeof payload.authKey === 'string' ? payload.authKey.trim() : '';
    const userFromPayload = payload.user && typeof payload.user === 'object' ? payload.user : null;
    if (!keyFromPayload) {
        return null;
    }

    return {
        key: keyFromPayload,
        user: userFromPayload
    };
}

function sanitizeProfile(profile) {
    const nextProfile = profile && typeof profile === 'object' ? { ...profile } : {};

    if ('profileInfo' in nextProfile) {
        delete nextProfile.profileInfo;
    }

    if (!Array.isArray(nextProfile.addons)) {
        nextProfile.addons = [];
    }

    if (nextProfile.auth !== null && typeof nextProfile.auth === 'object') {
        const key = typeof nextProfile.auth.key === 'string' ? nextProfile.auth.key.trim() : '';
        const user = nextProfile.auth.user && typeof nextProfile.auth.user === 'object' ? nextProfile.auth.user : null;
        nextProfile.auth = key
            && user
            ? {
                key,
                user
            }
            : null;
    } else {
        nextProfile.auth = null;
    }

    return nextProfile;
}

function readStoredProfile() {
    const raw = safeGetItem(PROFILE_STORAGE_KEY);
    if (typeof raw !== 'string' || raw.length === 0) {
        return null;
    }

    const parsed = parseJsonSafe(raw);
    return parsed ? sanitizeProfile(parsed) : null;
}

function writeStoredProfile(profile) {
    safeSetItem(PROFILE_STORAGE_KEY, JSON.stringify(sanitizeProfile(profile)));
}

function persistAuthenticatedSession(authPayload, fallbackProfileId) {
    const normalizedAuth = normalizeAuth(authPayload);
    if (!normalizedAuth || !normalizedAuth.user) {
        throw new Error('Invalid auth payload received from server');
    }

    const profileFromStorage = readStoredProfile() || {};

    const nextProfile = sanitizeProfile({
        ...profileFromStorage,
        auth: normalizedAuth
    });

    writeStoredProfile(nextProfile);

    const profileIdFromPayload = authPayload && authPayload.profile && typeof authPayload.profile.id === 'string'
        ? authPayload.profile.id
        : '';

    const profileId = profileIdFromPayload || fallbackProfileId;
    if (profileId) {
        safeSetItem(ACTIVE_PROFILE_ID_STORAGE_KEY, profileId);
    }
}

function clearAuthenticatedSession() {
    const storedProfile = readStoredProfile();

    if (!storedProfile) {
        safeRemoveItem(PROFILE_STORAGE_KEY);
    } else {
        writeStoredProfile({
            ...storedProfile,
            auth: null
        });
    }

    safeRemoveItem(ACTIVE_PROFILE_ID_STORAGE_KEY);
}

function getActiveProfileId() {
    const value = safeGetItem(ACTIVE_PROFILE_ID_STORAGE_KEY);
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
}

module.exports = {
    PROFILE_STORAGE_KEY,
    ACTIVE_PROFILE_ID_STORAGE_KEY,
    persistAuthenticatedSession,
    clearAuthenticatedSession,
    getActiveProfileId
};
