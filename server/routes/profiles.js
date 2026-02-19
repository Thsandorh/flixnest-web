// Copyright (C) 2017-2023 Smart code 203358507

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { encrypt } = require('../utils/encryption');

const PROFILES_FILE = path.join(__dirname, '../data/profiles.json');
const PROFILES_DIR = path.dirname(PROFILES_FILE);

/**
 * Load profiles from JSON file
 */
async function loadProfiles() {
    try {
        const data = await fs.readFile(PROFILES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(PROFILES_DIR, { recursive: true });
            await fs.writeFile(PROFILES_FILE, '[]', 'utf8');
            return [];
        }
        throw error;
    }
}

/**
 * Save profiles to JSON file
 */
async function saveProfiles(profiles) {
    await fs.mkdir(PROFILES_DIR, { recursive: true });
    await fs.writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 4), 'utf8');
}

/**
 * GET /api/profiles
 * Return list of profiles (without passwords)
 */
router.get('/', async (req, res) => {
    try {
        const profiles = await loadProfiles();

        // Remove sensitive data before sending
        const safeProfiles = profiles.map(profile => ({
            id: profile.id,
            name: profile.name,
            avatar: profile.avatar,
            hasPin: !!profile.pin
        }));

        res.json(safeProfiles);
    } catch (error) {
        console.error('Error fetching profiles:', error);
        res.status(500).json({ error: 'Failed to fetch profiles' });
    }
});

/**
 * POST /api/profiles
 * Create a new profile
 * Body: { name, avatar, email, password, pin? }
 */
router.post('/', async (req, res) => {
    try {
        const { name, avatar, email, password, pin } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const profiles = await loadProfiles();

        // Check if email already exists
        if (profiles.some(p => p.email === email)) {
            return res.status(409).json({ error: 'Profile with this email already exists' });
        }

        // Encrypt password
        const encryptedPassword = encrypt(password, process.env.ENCRYPTION_KEY);

        const newProfile = {
            id: `profile_${Date.now()}`,
            name,
            avatar: avatar || 'avatar1',
            email,
            encryptedPassword,
            pin: pin || null
        };

        profiles.push(newProfile);
        await saveProfiles(profiles);

        res.status(201).json({
            id: newProfile.id,
            name: newProfile.name,
            avatar: newProfile.avatar,
            hasPin: !!newProfile.pin
        });
    } catch (error) {
        console.error('Error creating profile:', error);
        res.status(500).json({ error: 'Failed to create profile' });
    }
});

/**
 * GET /api/profiles/:id
 * Return profile details for editor (without password)
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const profiles = await loadProfiles();
        const profile = profiles.find((p) => p.id === id);

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json({
            id: profile.id,
            name: profile.name,
            avatar: profile.avatar,
            email: profile.email,
            hasPin: !!profile.pin
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

/**
 * PUT /api/profiles/:id
 * Update an existing profile
 * Body: { name?, avatar?, email?, password?, pin? }
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, avatar, email, password, pin } = req.body;

        const profiles = await loadProfiles();
        const profileIndex = profiles.findIndex(p => p.id === id);

        if (profileIndex === -1) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const profile = profiles[profileIndex];

        if (email && profiles.some((p) => p.email === email && p.id !== id)) {
            return res.status(409).json({ error: 'Profile with this email already exists' });
        }

        // Update fields
        if (name) profile.name = name;
        if (avatar) profile.avatar = avatar;
        if (email) profile.email = email;
        if (password) profile.encryptedPassword = encrypt(password, process.env.ENCRYPTION_KEY);
        if (pin !== undefined) profile.pin = pin;

        profiles[profileIndex] = profile;
        await saveProfiles(profiles);

        res.json({
            id: profile.id,
            name: profile.name,
            avatar: profile.avatar,
            hasPin: !!profile.pin
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * DELETE /api/profiles/:id
 * Delete a profile
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const profiles = await loadProfiles();
        const filteredProfiles = profiles.filter(p => p.id !== id);

        if (filteredProfiles.length === profiles.length) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        await saveProfiles(filteredProfiles);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting profile:', error);
        res.status(500).json({ error: 'Failed to delete profile' });
    }
});

module.exports = router;
