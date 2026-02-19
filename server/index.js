#!/usr/bin/env node

// Copyright (C) 2017-2023 Smart code 203358507

require('dotenv').config();

const express = require('express');
const path = require('path');
const profilesRouter = require('./routes/profiles');
const authRouter = require('./routes/auth');

const INDEX_CACHE = 7200;
const ASSETS_CACHE = 2629744;
const HTTP_PORT = process.env.PORT || 8080;

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
app.use('/api', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// API Routes
app.use('/api/profiles', profilesRouter);
app.use('/api/auth', authRouter);

// Static files (Stremio Web build)
const build_path = path.resolve(__dirname, '../build');
const index_path = path.join(build_path, 'index.html');

app.use(express.static(build_path, {
    setHeaders: (res, filePath) => {
        if (filePath === index_path) {
            res.set('cache-control', `public, max-age: ${INDEX_CACHE}`);
        } else {
            res.set('cache-control', `public, max-age: ${ASSETS_CACHE}`);
        }
    }
}));

// SPA fallback - serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(index_path);
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(HTTP_PORT, () => {
    console.info(`Stremio Profile Switcher server listening on port: ${HTTP_PORT}`);
    console.info(`Serving static files from: ${build_path}`);
    console.info(`Encryption enabled with key length: ${process.env.ENCRYPTION_KEY.length} chars`);
});

