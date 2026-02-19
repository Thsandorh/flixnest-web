// Copyright (C) 2017-2023 Smart code 203358507

const crypto = require('crypto');
const express = require('express');
const { encrypt, decrypt } = require('../utils/encryption');
const { loginToStremio } = require('../utils/stremioAuth');
const { getScopeIdFromRequest, loadProfilesByScope, saveProfilesByScope } = require('../utils/profileStore');

const router = express.Router();
const VALIDATE_PROFILE_LOGIN = String(process.env.PROFILE_VALIDATE_LOGIN || 'true').toLowerCase() !== 'false';

function createBadRequestError(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function normalizeName(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeAvatar(value) {
    const avatar = typeof value === 'string' ? value.trim() : '';
    return avatar || 'avatar1';
}

function normalizePin(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const pin = String(value).trim();
    if (!/^\d{4}$/.test(pin)) {
        throw createBadRequestError('PIN must be exactly 4 digits');
    }

    return pin;
}

function generateProfileId() {
    if (typeof crypto.randomUUID === 'function') {
        return `profile_${crypto.randomUUID()}`;
    }

    return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toPublicProfile(profile) {
    return {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        hasPin: !!profile.pin
    };
}

function assertRequiredFields(name, email, password) {
    if (!name || !email || !password) {
        throw createBadRequestError('Name, email, and password are required');
    }
}

async function validateStremioCredentialsIfEnabled(email, password) {
    if (!VALIDATE_PROFILE_LOGIN) {
        return;
    }

    try {
        await loginToStremio(email, password);
    } catch (error) {
        if (error && (error.status === 401 || error.status === 404)) {
            throw createBadRequestError('Invalid Stremio email or password');
        }

        throw error;
    }
}

router.get('/', async (req, res) => {
    try {
        const scopeId = getScopeIdFromRequest(req);
        const profiles = await loadProfilesByScope(scopeId);
        return res.json(profiles.map(toPublicProfile));
    } catch (error) {
        console.error('Error fetching profiles:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Failed to fetch profiles' });
    }
});

router.post('/', async (req, res) => {
    try {
        const scopeId = getScopeIdFromRequest(req);
        const name = normalizeName(req.body.name);
        const email = normalizeEmail(req.body.email);
        const password = typeof req.body.password === 'string' ? req.body.password : '';
        const avatar = normalizeAvatar(req.body.avatar);
        const pin = normalizePin(req.body.pin);

        assertRequiredFields(name, email, password);

        const profiles = await loadProfilesByScope(scopeId);

        await validateStremioCredentialsIfEnabled(email, password);

        const encryptedPassword = encrypt(password, process.env.ENCRYPTION_KEY);
        const newProfile = {
            id: generateProfileId(),
            name,
            avatar,
            email,
            encryptedPassword,
            pin
        };

        profiles.push(newProfile);
        await saveProfilesByScope(scopeId, profiles);

        return res.status(201).json(toPublicProfile(newProfile));
    } catch (error) {
        console.error('Error creating profile:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Failed to create profile' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const scopeId = getScopeIdFromRequest(req);
        const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
        const profiles = await loadProfilesByScope(scopeId);
        const profile = profiles.find((item) => item && item.id === id);

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        return res.json({
            id: profile.id,
            name: profile.name,
            avatar: profile.avatar,
            email: profile.email,
            pin: profile.pin || '',
            hasPin: !!profile.pin
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        return res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const scopeId = getScopeIdFromRequest(req);
        const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
        const profiles = await loadProfilesByScope(scopeId);
        const profileIndex = profiles.findIndex((profile) => profile && profile.id === id);

        if (profileIndex === -1) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const currentProfile = profiles[profileIndex];
        const name = req.body.name !== undefined ? normalizeName(req.body.name) : currentProfile.name;
        const avatar = req.body.avatar !== undefined ? normalizeAvatar(req.body.avatar) : currentProfile.avatar;
        const email = req.body.email !== undefined && req.body.email !== ''
            ? normalizeEmail(req.body.email)
            : currentProfile.email;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const nextProfile = {
            ...currentProfile,
            name,
            avatar,
            email
        };
        const emailChanged = normalizeEmail(currentProfile.email) !== email;

        if (req.body.password !== undefined && req.body.password !== '') {
            const password = String(req.body.password);
            await validateStremioCredentialsIfEnabled(email, password);
            nextProfile.encryptedPassword = encrypt(password, process.env.ENCRYPTION_KEY);
        } else if (emailChanged && VALIDATE_PROFILE_LOGIN) {
            const currentPassword = decrypt(currentProfile.encryptedPassword, process.env.ENCRYPTION_KEY);
            await loginToStremio(email, currentPassword);
        }

        if (req.body.pin !== undefined) {
            nextProfile.pin = normalizePin(req.body.pin);
        }

        profiles[profileIndex] = nextProfile;
        await saveProfilesByScope(scopeId, profiles);

        return res.json(toPublicProfile(nextProfile));
    } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(error.status || 500).json({ error: error.message || 'Failed to update profile' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const scopeId = getScopeIdFromRequest(req);
        const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
        const profiles = await loadProfilesByScope(scopeId);
        const nextProfiles = profiles.filter((profile) => profile && profile.id !== id);

        if (nextProfiles.length === profiles.length) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        await saveProfilesByScope(scopeId, nextProfiles);
        return res.status(204).send();
    } catch (error) {
        console.error('Error deleting profile:', error);
        return res.status(500).json({ error: 'Failed to delete profile' });
    }
});

module.exports = router;
