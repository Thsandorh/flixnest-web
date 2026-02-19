// Copyright (C) 2017-2023 Smart code 203358507

const memoryStorage = new Map();

function safeGetItem(key) {
    const normalizedKey = String(key);

    try {
        return window.localStorage.getItem(normalizedKey);
    } catch (_) {
        return memoryStorage.has(normalizedKey) ? memoryStorage.get(normalizedKey) : null;
    }
}

function safeSetItem(key, value) {
    const normalizedKey = String(key);
    const normalizedValue = String(value);

    try {
        window.localStorage.setItem(normalizedKey, normalizedValue);
        memoryStorage.delete(normalizedKey);
    } catch (_) {
        memoryStorage.set(normalizedKey, normalizedValue);
    }
}

function safeRemoveItem(key) {
    const normalizedKey = String(key);

    try {
        window.localStorage.removeItem(normalizedKey);
    } catch (_) {
        // ignore
    }

    memoryStorage.delete(normalizedKey);
}

function safeClear() {
    try {
        window.localStorage.clear();
    } catch (_) {
        // ignore
    }

    memoryStorage.clear();
}

function getStorageBridgeFacade() {
    return {
        getItem: safeGetItem,
        setItem: safeSetItem,
        removeItem: safeRemoveItem,
        clear: safeClear
    };
}

module.exports = {
    safeGetItem,
    safeSetItem,
    safeRemoveItem,
    safeClear,
    getStorageBridgeFacade
};
