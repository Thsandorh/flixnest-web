// Copyright (C) 2017-2023 Smart code 203358507

const EventEmitter = require('eventemitter3');
const CoreTransport = require('./CoreTransport');
const CORE_INIT_RECOVERY_FLAG = 'coreInitRecoveryAttempted';

function summarizeTransportError(error) {
    if (!error) {
        return { message: 'Unknown core transport error' };
    }

    if (error instanceof Error) {
        return {
            message: error.message,
            stack: error.stack || null
        };
    }

    if (typeof error === 'object') {
        return {
            stage: error.stage || null,
            message: typeof error.message === 'string' ? error.message : 'Core transport error',
            workerScriptUrl: error.workerScriptUrl || null,
            stack: error.stack || null,
            raw: error.raw || null
        };
    }

    return { message: String(error) };
}

function toSafeLogString(value) {
    try {
        return JSON.stringify(value);
    } catch (_) {
        return String(value);
    }
}

function tryRecoverFromCoreInitError() {
    try {
        if (window.sessionStorage.getItem(CORE_INIT_RECOVERY_FLAG) === '1') {
            window.sessionStorage.removeItem(CORE_INIT_RECOVERY_FLAG);
            return false;
        }

        window.sessionStorage.setItem(CORE_INIT_RECOVERY_FLAG, '1');
        window.localStorage.removeItem('profile');
        window.localStorage.removeItem('activeProfileId');
        window.location.hash = '#/profile-selector';
        window.location.reload();
        return true;
    } catch (_) {
        return false;
    }
}

function Core(args) {
    let active = false;
    let error = null;
    let starting = false;
    let transport = null;

    const events = new EventEmitter();

    function onTransportInit() {
        active = true;
        error = null;
        starting = false;
        try {
            window.sessionStorage.removeItem(CORE_INIT_RECOVERY_FLAG);
        } catch (_) {
            // ignore
        }
        onStateChanged();
    }
    function onTransportError(args) {
        const summary = summarizeTransportError(args);
        try {
            window.__LAST_CORE_ERROR__ = summary;
        } catch (_) {
            // ignore
        }
        console.error('Core transport init failed:', summary);
        console.error('Core transport init failed (json):', toSafeLogString(summary));
        if (tryRecoverFromCoreInitError()) {
            return;
        }
        active = false;
        error = new Error(
            `Stremio Core Transport initialization failed: ${summary.message || summary.stage || 'unknown'}`
        );
        error.cause = args;
        error.details = summary;
        starting = false;
        onStateChanged();
        transport = null;
    }
    function onStateChanged() {
        events.emit('stateChanged');
    }

    Object.defineProperties(this, {
        active: {
            configurable: false,
            enumerable: true,
            get: function() {
                return active;
            }
        },
        error: {
            configurable: false,
            enumerable: true,
            get: function() {
                return error;
            }
        },
        starting: {
            configurable: false,
            enumerable: true,
            get: function() {
                return starting;
            }
        },
        transport: {
            configurable: false,
            enumerable: true,
            get: function() {
                return transport;
            }
        }
    });

    this.start = function() {
        if (active || error instanceof Error || starting) {
            return;
        }

        starting = true;
        transport = new CoreTransport(args);
        transport.on('init', onTransportInit);
        transport.on('error', onTransportError);
        onStateChanged();
    };
    this.stop = function() {
        active = false;
        error = null;
        starting = false;
        onStateChanged();
        if (transport !== null) {
            transport.removeAllListeners();
            transport = null;
        }
    };
    this.on = function(name, listener) {
        events.on(name, listener);
    };
    this.off = function(name, listener) {
        events.off(name, listener);
    };
}

module.exports = Core;
