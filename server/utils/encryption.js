// Copyright (C) 2017-2023 Smart code 203358507

const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Encrypt a string using AES-256-CBC
 * @param {string} text - Text to encrypt
 * @param {string} encryptionKey - 32-character encryption key
 * @returns {string} Encrypted text in format: iv:encryptedData
 */
function encrypt(text, encryptionKey) {
    if (!encryptionKey || encryptionKey.length !== 32) {
        throw new Error('Encryption key must be exactly 32 characters');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(encryptionKey), iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a string using AES-256-CBC
 * @param {string} text - Encrypted text in format: iv:encryptedData
 * @param {string} encryptionKey - 32-character encryption key
 * @returns {string} Decrypted text
 */
function decrypt(text, encryptionKey) {
    if (!encryptionKey || encryptionKey.length !== 32) {
        throw new Error('Encryption key must be exactly 32 characters');
    }

    const parts = text.split(':');
    if (parts.length !== 2) {
        throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];

    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(encryptionKey), iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

module.exports = {
    encrypt,
    decrypt
};
