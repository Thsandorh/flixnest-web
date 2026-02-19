// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const { useTranslation } = require('react-i18next');

// Available avatar options (emoji-based)
const AVATAR_OPTIONS = [
    { id: 'avatar1', emoji: '\uD83E\uDD81', bg: '#e74c3c' },
    { id: 'avatar2', emoji: '\uD83D\uDC2F', bg: '#e67e22' },
    { id: 'avatar3', emoji: '\uD83D\uDC3B', bg: '#f39c12' },
    { id: 'avatar4', emoji: '\uD83D\uDC3D', bg: '#2ecc71' },
    { id: 'avatar5', emoji: '\uD83D\uDC28', bg: '#1abc9c' },
    { id: 'avatar6', emoji: '\uD83E\uDD8A', bg: '#3498db' },
    { id: 'avatar7', emoji: '\uD83D\uDC3A', bg: '#9b59b6' },
    { id: 'avatar8', emoji: '\uD83E\uDD9D', bg: '#e91e63' },
    { id: 'avatar9', emoji: '\uD83D\uDC38', bg: '#00bcd4' },
    { id: 'avatar10', emoji: '\uD83E\uDD84', bg: '#ff5722' },
    { id: 'avatar11', emoji: '\uD83D\uDC27', bg: '#795548' },
    { id: 'avatar12', emoji: '\uD83E\uDD8B', bg: '#607d8b' },
];

const modalStyles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
    },
    modal: {
        background: '#1e1e2e',
        padding: '2rem',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    },
    header: {
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        margin: 0,
        color: '#fff',
        fontSize: '1.6rem',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '1.5rem',
        cursor: 'pointer',
        padding: '4px 8px',
    },
    fieldGroup: {
        marginBottom: '1.2rem',
    },
    label: {
        display: 'block',
        color: 'rgba(255,255,255,0.8)',
        fontSize: '0.9rem',
        marginBottom: '0.4rem',
    },
    input: {
        width: '100%',
        padding: '0.8rem',
        background: 'rgba(255,255,255,0.05)',
        border: '2px solid rgba(255,255,255,0.2)',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '1rem',
        outline: 'none',
        boxSizing: 'border-box',
    },
    avatarGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '0.5rem',
        marginTop: '0.5rem',
    },
    avatarOption: {
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.5rem',
        cursor: 'pointer',
        border: '3px solid transparent',
        transition: 'all 0.2s ease',
    },
    errorMsg: {
        color: '#ff5555',
        fontSize: '0.9rem',
        marginBottom: '1rem',
    },
    actions: {
        display: 'flex',
        gap: '1rem',
        marginTop: '1.5rem',
    },
    cancelBtn: {
        flex: 1,
        padding: '0.8rem',
        background: 'rgba(255,255,255,0.1)',
        border: '2px solid rgba(255,255,255,0.3)',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '1rem',
        cursor: 'pointer',
    },
    submitBtn: {
        flex: 2,
        padding: '0.8rem',
        background: '#667eea',
        border: 'none',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '1rem',
        cursor: 'pointer',
    },
    deleteBtn: {
        padding: '0.8rem 1rem',
        background: 'rgba(255, 0, 0, 0.15)',
        border: '2px solid rgba(255, 0, 0, 0.3)',
        borderRadius: '8px',
        color: '#ff5555',
        fontSize: '1rem',
        cursor: 'pointer',
    },
};

const ProfileModal = ({ profile, onSave, onDelete, onClose }) => {
    const { t } = useTranslation();
    const isEditing = !!profile;

    const [name, setName] = React.useState(profile?.name || '');
    const [email, setEmail] = React.useState(profile?.email || '');
    const [password, setPassword] = React.useState('');
    const [pin, setPin] = React.useState(profile?.pin || '');
    const [selectedAvatar, setSelectedAvatar] = React.useState(
        (profile?.avatar && profile.avatar.replace('.png', '')) || AVATAR_OPTIONS[0].id
    );
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleSubmit = async () => {
        setError('');

        if (!name.trim()) {
            setError('Name is required');
            return;
        }
        if (!isEditing && !email.trim()) {
            setError('Email is required');
            return;
        }
        if (!isEditing && !password) {
            setError('Password is required');
            return;
        }
        if (pin && (pin.length !== 4 || !/^\d+$/.test(pin))) {
            setError('PIN must be exactly 4 digits');
            return;
        }

        setLoading(true);
        try {
            await onSave({
                name: name.trim(),
                email: email.trim(),
                password: password || undefined,
                avatar: selectedAvatar,
                pin: pin || null
            });
        } catch (err) {
            setError(err.message || 'Failed to save profile');
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete profile "${profile.name}"? This cannot be undone.`)) {
            return;
        }
        setLoading(true);
        try {
            await onDelete(profile.id);
        } catch (err) {
            setError(err.message || 'Failed to delete profile');
            setLoading(false);
        }
    };

    return (
        <div style={modalStyles.overlay} onClick={onClose}>
            <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={modalStyles.header}>
                    <h2 style={modalStyles.title}>
                        {isEditing ? 'Edit Profile' : 'Add Profile'}
                    </h2>
                    <button style={modalStyles.closeBtn} onClick={onClose}>X</button>
                </div>

                {/* Avatar selector */}
                <div style={modalStyles.fieldGroup}>
                    <label style={modalStyles.label}>{t('PROFILE_AVATAR_LABEL')}</label>
                    <div style={modalStyles.avatarGrid}>
                        {AVATAR_OPTIONS.map((avatar) => (
                            <div
                                key={avatar.id}
                                style={{
                                    ...modalStyles.avatarOption,
                                    background: avatar.bg,
                                    borderColor: selectedAvatar === avatar.id
                                        ? '#fff'
                                        : 'transparent',
                                    transform: selectedAvatar === avatar.id
                                        ? 'scale(1.1)'
                                        : 'scale(1)',
                                }}
                                onClick={() => setSelectedAvatar(avatar.id)}
                                title={avatar.emoji}
                            >
                                {avatar.emoji}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Name */}
                <div style={modalStyles.fieldGroup}>
                    <label style={modalStyles.label}>{t('PROFILE_NAME_LABEL')}</label>
                    <input
                        style={modalStyles.input}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Sanyi"
                        autoFocus
                    />
                </div>

                {/* Email */}
                <div style={modalStyles.fieldGroup}>
                    <label style={modalStyles.label}>
                        {t('PROFILE_EMAIL_LABEL')}{isEditing ? ' (leave empty to keep current)' : ''}
                    </label>
                    <input
                        style={modalStyles.input}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                    />
                </div>

                {/* Password */}
                <div style={modalStyles.fieldGroup}>
                    <label style={modalStyles.label}>
                        {t('PROFILE_PASSWORD_LABEL')}{isEditing ? ' (leave empty to keep current)' : ''}
                    </label>
                    <input
                        style={modalStyles.input}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isEditing ? '********' : 'Enter Stremio password'}
                    />
                </div>

                {/* PIN (optional) */}
                <div style={modalStyles.fieldGroup}>
                    <label style={modalStyles.label}>{t('PROFILE_PIN_LABEL')}</label>
                    <input
                        style={modalStyles.input}
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setPin(val);
                        }}
                        placeholder="Leave empty for no PIN"
                    />
                </div>

                {error && <div style={modalStyles.errorMsg}>{error}</div>}

                <div style={modalStyles.actions}>
                    {isEditing && (
                        <button
                            style={modalStyles.deleteBtn}
                            onClick={handleDelete}
                            disabled={loading}
                        >
                            {t('PROFILE_DELETE')}
                        </button>
                    )}
                    <button
                        style={modalStyles.cancelBtn}
                        onClick={onClose}
                        disabled={loading}
                    >
                        {t('BUTTON_CANCEL')}
                    </button>
                    <button
                        style={modalStyles.submitBtn}
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Profile'}
                    </button>
                </div>
            </div>
        </div>
    );
};

ProfileModal.propTypes = {
    profile: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        email: PropTypes.string,
        avatar: PropTypes.string,
        pin: PropTypes.string
    }),
    onSave: PropTypes.func.isRequired,
    onDelete: PropTypes.func,
    onClose: PropTypes.func.isRequired
};

module.exports = ProfileModal;
module.exports.AVATAR_OPTIONS = AVATAR_OPTIONS;

