// Copyright (C) 2017-2023 Smart code 203358507

const fs = require('fs').promises;
const path = require('path');

const SCOPED_PROFILES_DIR = path.join(__dirname, '../data/scoped-profiles');

function createBadRequestError(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function normalizeScopeId(rawScopeId) {
    if (typeof rawScopeId !== 'string') {
        return null;
    }

    const trimmed = rawScopeId.trim();
    if (!trimmed) {
        return null;
    }

    if (trimmed.length > 128) {
        return null;
    }

    return /^[A-Za-z0-9_-]+$/.test(trimmed) ? trimmed : null;
}

function getScopeIdFromRequest(req) {
    const headerScope = req.get('x-profile-scope');
    const normalized = normalizeScopeId(headerScope);

    if (!normalized) {
        throw createBadRequestError('Missing or invalid profile scope');
    }

    return normalized;
}

function getScopeFilePath(scopeId) {
    return path.join(SCOPED_PROFILES_DIR, `${scopeId}.json`);
}

async function loadProfilesByScope(scopeId) {
    const filePath = getScopeFilePath(scopeId);

    try {
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(SCOPED_PROFILES_DIR, { recursive: true });
            await fs.writeFile(filePath, '[]', 'utf8');
            return [];
        }

        throw error;
    }
}

async function saveProfilesByScope(scopeId, profiles) {
    const filePath = getScopeFilePath(scopeId);

    await fs.mkdir(SCOPED_PROFILES_DIR, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(profiles, null, 4), 'utf8');
}

module.exports = {
    getScopeIdFromRequest,
    loadProfilesByScope,
    saveProfilesByScope
};
