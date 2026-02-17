// Copyright (C) 2017-2023 Smart code 203358507

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { decrypt } = require('../utils/encryption');

const PROFILES_FILE = path.join(__dirname, '../data/profiles.json');
const STREMIO_API_URL = process.env.STREMIO_API_URL || 'https://api.strem.io/api';

/**
 * Load profiles from JSON file
 */
async function loadProfiles() {
    try {
        const data = await fs.readFile(PROFILES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading profiles:', error);
        return [];
    }
}

/**
 * POST /api/auth/switch
 * Switch to a profile by logging in to Stremio API
 * Body: { profileId, pin? }
 */
router.post('/switch', async (req, res) => {
    try {
        const { profileId, pin } = req.body;

        if (!profileId) {
            return res.status(400).json({ error: 'Profile ID is required' });
        }

        const profiles = await loadProfiles();
        const profile = profiles.find(p => p.id === profileId);

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // Check PIN if required
        if (profile.pin && profile.pin !== pin) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        // Decrypt password
        let password;
        try {
            password = decrypt(profile.encryptedPassword, process.env.ENCRYPTION_KEY);
        } catch (error) {
            console.error('Error decrypting password:', error);
            return res.status(500).json({ error: 'Failed to decrypt password. Check ENCRYPTION_KEY.' });
        }

        // Login to Stremio API
        try {
            const response = await fetch(`${STREMIO_API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: profile.email,
                    password: password
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Stremio API error:', errorData);
                return res.status(response.status).json({
                    error: errorData.error || 'Stremio login failed'
                });
            }

            const data = await response.json();

            // Return authKey and user data
            res.json({
                authKey: data.authKey,
                user: data.user,
                profile: {
                    id: profile.id,
                    name: profile.name,
                    avatar: profile.avatar
                }
            });
        } catch (error) {
            console.error('Error calling Stremio API:', error);
            res.status(500).json({ error: 'Failed to connect to Stremio API' });
        }
    } catch (error) {
        console.error('Error switching profile:', error);
        res.status(500).json({ error: 'Failed to switch profile' });
    }
});

/**
 * POST /api/auth/refresh
 * Re-authenticate with stored credentials to get a fresh authKey (no PIN required)
 * Intended for auto-renewal when a stored authKey has expired.
 * Body: { profileId }
 */
router.post('/refresh', async (req, res) => {
    try {
        const { profileId } = req.body;

        if (!profileId) {
            return res.status(400).json({ error: 'Profile ID is required' });
        }

        const profiles = await loadProfiles();
        const profile = profiles.find(p => p.id === profileId);

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // Decrypt password
        let password;
        try {
            password = decrypt(profile.encryptedPassword, process.env.ENCRYPTION_KEY);
        } catch (error) {
            console.error('Error decrypting password:', error);
            return res.status(500).json({ error: 'Failed to decrypt password. Check ENCRYPTION_KEY.' });
        }

        // Re-login to Stremio API
        try {
            const response = await fetch(`${STREMIO_API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: profile.email, password })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Stremio API error during refresh:', errorData);
                return res.status(response.status).json({
                    error: errorData.error || 'Stremio login failed during refresh'
                });
            }

            const data = await response.json();

            res.json({
                authKey: data.authKey,
                user: data.user,
                profile: {
                    id: profile.id,
                    name: profile.name,
                    avatar: profile.avatar
                }
            });
        } catch (error) {
            console.error('Error calling Stremio API during refresh:', error);
            res.status(500).json({ error: 'Failed to connect to Stremio API' });
        }
    } catch (error) {
        console.error('Error refreshing authKey:', error);
        res.status(500).json({ error: 'Failed to refresh authKey' });
    }
});

/**
 * POST /api/auth/verify-pin
 * Verify PIN for a profile without logging in
 * Body: { profileId, pin }
 */
router.post('/verify-pin', async (req, res) => {
    try {
        const { profileId, pin } = req.body;

        if (!profileId || !pin) {
            return res.status(400).json({ error: 'Profile ID and PIN are required' });
        }

        const profiles = await loadProfiles();
        const profile = profiles.find(p => p.id === profileId);

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        if (profile.pin === pin) {
            res.json({ valid: true });
        } else {
            res.status(401).json({ valid: false, error: 'Invalid PIN' });
        }
    } catch (error) {
        console.error('Error verifying PIN:', error);
        res.status(500).json({ error: 'Failed to verify PIN' });
    }
});

module.exports = router;
