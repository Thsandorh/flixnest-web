// Copyright (C) 2017-2023 Smart code 203358507

const STREMIO_API_URL = process.env.STREMIO_API_URL || 'https://api.strem.io/api';

function createHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function normalizeLoginResponse(data) {
    const payload = data && typeof data === 'object' && data.result && typeof data.result === 'object'
        ? data.result
        : data;

    return {
        authKey: payload && typeof payload.authKey === 'string' ? payload.authKey : null,
        user: payload && payload.user && typeof payload.user === 'object' ? payload.user : null
    };
}

function extractPayloadError(data) {
    if (!data || typeof data !== 'object') {
        return null;
    }

    if (typeof data.error === 'string' && data.error.length > 0) {
        return data.error;
    }

    if (data.error && typeof data.error === 'object' && typeof data.error.message === 'string' && data.error.message.length > 0) {
        return data.error.message;
    }

    if (typeof data.message === 'string' && data.message.length > 0) {
        return data.message;
    }

    return null;
}

async function readErrorBody(response) {
    const text = await response.text();
    if (!text) {
        return null;
    }

    try {
        const parsed = JSON.parse(text);
        return extractPayloadError(parsed) || text;
    } catch (_) {
        return text;
    }
}

async function loginToStremio(email, password) {
    let response;

    try {
        response = await fetch(`${STREMIO_API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
    } catch (error) {
        throw createHttpError(502, `Failed to connect to Stremio API: ${error.message}`);
    }

    if (!response.ok) {
        const message = await readErrorBody(response);
        throw createHttpError(response.status || 502, message || 'Stremio login failed');
    }

    let data;
    try {
        data = await response.json();
    } catch (_) {
        throw createHttpError(502, 'Invalid JSON response from Stremio login');
    }

    const payloadError = extractPayloadError(data);
    if (payloadError) {
        throw createHttpError(401, payloadError);
    }

    const login = normalizeLoginResponse(data);
    if (!login.authKey) {
        throw createHttpError(502, 'Stremio login response missing authKey');
    }

    return login;
}

module.exports = {
    createHttpError,
    loginToStremio
};
