// Copyright (C) 2017-2023 Smart code 203358507

const express = require('express');
const { decrypt } = require('../utils/encryption');
const { loginToStremio } = require('../utils/stremioAuth');
const { getScopeIdFromRequest, loadProfilesByScope } = require('../utils/profileStore');

const router = express.Router();

function normalizePin(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const pin = String(value).trim();
    if (!pin) {
        return null;
    }

    return pin;
}

function findProfileById(profiles, profileId) {
    return profiles.find((profile) => profile && profile.id === profileId) || null;
}

function getDecryptedPassword(profile) {
    if (!profile || typeof profile.encryptedPassword !== 'string' || profile.encryptedPassword.length === 0) {
        throw new Error('Stored profile password is missing');
    }

    return decrypt(profile.encryptedPassword, process.env.ENCRYPTION_KEY);
}

function buildAuthPayload(profile, login) {
    return {
        authKey: login.authKey,
        auth: {
            key: login.authKey,
            user: login.user
        },
        user: login.user,
        profile: {
            id: profile.id,
            name: profile.name,
            avatar: profile.avatar
        }
    };
}

async function loginWithStoredProfile(profile) {
    const password = getDecryptedPassword(profile);
    return loginToStremio(profile.email, password);
}

router.post('/switch', async (req, res) => {
    try {
        const scopeId = getScopeIdFromRequest(req);
        const profileId = typeof req.body.profileId === 'string' ? req.body.profileId.trim() : '';
        const pin = normalizePin(req.body.pin);

        if (!profileId) {
            return res.status(400).json({ error: 'Profile ID is required' });
        }

        const profiles = await loadProfilesByScope(scopeId);
        const profile = findProfileById(profiles, profileId);

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const expectedPin = normalizePin(profile.pin);
        if (expectedPin && pin !== expectedPin) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        const login = await loginWithStoredProfile(profile);
        return res.json(buildAuthPayload(profile, login));
    } catch (error) {
        console.error('Error switching profile:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Failed to switch profile' });
    }
});

router.post('/refresh', async (req, res) => {
    try {
        const scopeId = getScopeIdFromRequest(req);
        const profileId = typeof req.body.profileId === 'string' ? req.body.profileId.trim() : '';

        if (!profileId) {
            return res.status(400).json({ error: 'Profile ID is required' });
        }

        const profiles = await loadProfilesByScope(scopeId);
        const profile = findProfileById(profiles, profileId);

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const login = await loginWithStoredProfile(profile);
        return res.json(buildAuthPayload(profile, login));
    } catch (error) {
        console.error('Error refreshing authKey:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Failed to refresh authKey' });
    }
});

router.post('/verify-pin', async (req, res) => {
    try {
        const scopeId = getScopeIdFromRequest(req);
        const profileId = typeof req.body.profileId === 'string' ? req.body.profileId.trim() : '';
        const pin = normalizePin(req.body.pin);

        if (!profileId || !pin) {
            return res.status(400).json({ error: 'Profile ID and PIN are required' });
        }

        const profiles = await loadProfilesByScope(scopeId);
        const profile = findProfileById(profiles, profileId);

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const expectedPin = normalizePin(profile.pin);
        if (!expectedPin) {
            return res.status(400).json({ error: 'Profile has no PIN' });
        }

        if (expectedPin !== pin) {
            return res.status(401).json({ valid: false, error: 'Invalid PIN' });
        }

        return res.json({ valid: true });
    } catch (error) {
        console.error('Error verifying PIN:', error);
        return res.status(500).json({ error: 'Failed to verify PIN' });
    }
});

module.exports = router;
