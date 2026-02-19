// Copyright (C) 2017-2023 Smart code 203358507

const EventEmitter = require('eventemitter3');
const Bridge = require('@stremio/stremio-core-web/bridge');
const { getStorageBridgeFacade } = require('stremio/common/safeStorage');

function normalizeTransportError(error, context) {
    const normalized = {
        stage: context && context.stage ? context.stage : 'unknown',
        workerScriptUrl: context && context.workerScriptUrl ? context.workerScriptUrl : null,
        message: null,
        stack: null,
        raw: null
    };

    if (error instanceof Error) {
        normalized.message = error.message;
        normalized.stack = error.stack || null;
        normalized.raw = {
            name: error.name,
            message: error.message
        };
        return normalized;
    }

    if (error && typeof error === 'object') {
        const maybeMessage = typeof error.message === 'string'
            ? error.message
            : typeof error.reason === 'string'
                ? error.reason
                : null;
        normalized.message = maybeMessage;
        normalized.raw = error;
        return normalized;
    }

    normalized.message = String(error);
    normalized.raw = error;
    return normalized;
}

function sanitizeStoredProfileForCore() {
    try {
        const raw = window.localStorage.getItem('profile');
        if (typeof raw !== 'string' || raw.length === 0) {
            return;
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            window.localStorage.removeItem('profile');
            return;
        }

        if ('profileInfo' in parsed) {
            delete parsed.profileInfo;
        }
        if (!Array.isArray(parsed.addons)) {
            parsed.addons = [];
        }
        if (parsed.auth !== null && typeof parsed.auth === 'object') {
            const key = typeof parsed.auth.key === 'string'
                ? parsed.auth.key
                : typeof parsed.auth.authKey === 'string'
                    ? parsed.auth.authKey
                    : null;
            const user = parsed.auth.user && typeof parsed.auth.user === 'object' ? parsed.auth.user : null;

            parsed.auth = key
                && user
                ? {
                    key,
                    user
                }
                : null;
        } else {
            parsed.auth = null;
        }

        window.localStorage.setItem('profile', JSON.stringify(parsed));
    } catch (_) {
        // If profile storage is malformed, clear it so core can bootstrap with defaults.
        try {
            window.localStorage.removeItem('profile');
        } catch (_clearError) {
            return;
        }
    }
}

function resolveWorkerScriptUrl() {
    try {
        const scripts = Array.from(document.scripts || [])
            .map((script) => script && script.src)
            .filter((src) => typeof src === 'string' && src.length > 0);

        const mainScriptUrl = scripts.find((src) => /\/scripts\/main\.js(?:\?.*)?$/.test(src));
        if (mainScriptUrl) {
            return mainScriptUrl.replace(/\/scripts\/main\.js(?:\?.*)?$/, '/scripts/worker.js');
        }
    } catch (_) {
        // Fall back to compile-time path below.
    }

    return `${process.env.COMMIT_HASH}/scripts/worker.js`;
}

function CoreTransport(args) {
    const events = new EventEmitter();
    sanitizeStoredProfileForCore();
    const workerScriptUrl = resolveWorkerScriptUrl();
    const worker = new Worker(workerScriptUrl);
    const bridgeScope = {
        location: {
            get hash() {
                try {
                    return window.location.hash;
                } catch (_) {
                    return '';
                }
            }
        },
        localStorage: getStorageBridgeFacade(),
        onCoreEvent: ({ name, args }) => {
            try {
                events.emit(name, args);
            } catch (error) {
                console.error('CoreTransport', error);
            }
        }
    };
    const bridge = new Bridge(bridgeScope, worker);

    worker.addEventListener('error', (event) => {
        events.emit('error', normalizeTransportError(event, {
            stage: 'worker.error',
            workerScriptUrl
        }));
    });

    worker.addEventListener('messageerror', (event) => {
        events.emit('error', normalizeTransportError(event, {
            stage: 'worker.messageerror',
            workerScriptUrl
        }));
    });

    window.onCoreEvent = bridgeScope.onCoreEvent;

    bridge.call(['init'], [args])
        .then(() => {
            try {
                events.emit('init');
            } catch (error) {
                console.error('CoreTransport', error);
            }
        })
        .catch((error) => {
            events.emit('error', normalizeTransportError(error, {
                stage: 'bridge.init',
                workerScriptUrl
            }));
        });

    this.on = function(name, listener) {
        events.on(name, listener);
    };
    this.off = function(name, listener) {
        events.off(name, listener);
    };
    this.removeAllListeners = function() {
        events.removeAllListeners();
    };
    this.getState = async function(field) {
        return bridge.call(['getState'], [field]);
    };
    this.getDebugState = async function() {
        return bridge.call(['getDebugState'], []);
    };
    this.dispatch = async function(action, field) {
        return bridge.call(['dispatch'], [action, field, location.hash]);
    };
    this.analytics = async function(event) {
        return bridge.call(['analytics'], [event, location.hash]);
    };
    this.decodeStream = async function(stream) {
        return bridge.call(['decodeStream'], [stream]);
    };
}

module.exports = CoreTransport;
