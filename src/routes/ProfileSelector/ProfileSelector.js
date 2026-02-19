// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useTranslation } = require('react-i18next');
const { useProfile } = require('stremio/common');
const ProfileCard = require('./ProfileCard');
const PinModal = require('./PinModal');
const ProfileModal = require('./ProfileModal');
const { AVATAR_OPTIONS } = require('./ProfileModal');
const { scopedFetch } = require('./profileApi');
const {
    persistAuthenticatedSession,
    clearAuthenticatedSession,
    getActiveProfileId
} = require('./profileSession');
const styles = require('./styles');

const API_BASE = typeof window !== 'undefined'
    ? `${window.location.origin}${String(window.__STREMIO_BASE_PATH__ || '').replace(/\/+$/, '')}`
    : '';

const AVATAR_MAP = AVATAR_OPTIONS.reduce((accumulator, avatar) => {
    accumulator[avatar.id] = avatar;
    accumulator[`${avatar.id}.png`] = avatar;
    return accumulator;
}, {});

function parseJsonSafe(text) {
    try {
        return JSON.parse(text);
    } catch (_) {
        return null;
    }
}

async function parseApiResponse(response) {
    const text = await response.text();
    const json = text ? parseJsonSafe(text) : null;

    if (!response.ok) {
        const errorMessage = json && typeof json.error === 'string' && json.error.length > 0
            ? json.error
            : text || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
    }

    return json;
}

function navigateToApp() {
    window.location.hash = '#/';
    window.location.reload();
}

const ProfileSelector = () => {
    const { t } = useTranslation();
    const currentProfile = useProfile();
    const currentProfileRef = React.useRef(currentProfile);

    const [profiles, setProfiles] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [switchingProfileId, setSwitchingProfileId] = React.useState(null);

    const [selectedProfile, setSelectedProfile] = React.useState(null);
    const [showPinModal, setShowPinModal] = React.useState(false);

    const [showProfileModal, setShowProfileModal] = React.useState(false);
    const [editingProfile, setEditingProfile] = React.useState(null);

    React.useEffect(() => {
        currentProfileRef.current = currentProfile;
    }, [currentProfile]);

    const loadProfiles = React.useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await scopedFetch(`${API_BASE}/api/profiles`);
            const data = await parseApiResponse(response);
            setProfiles(Array.isArray(data) ? data : []);
        } catch (loadError) {
            console.error('Error loading profiles:', loadError);
            setError(loadError.message || 'Failed to load profiles');
        } finally {
            setLoading(false);
        }
    }, []);

    const restoreSession = React.useCallback(async () => {
        if (currentProfileRef.current && currentProfileRef.current.auth) {
            return false;
        }

        const activeProfileId = getActiveProfileId();
        if (!activeProfileId) {
            return false;
        }

        try {
            const response = await scopedFetch(`${API_BASE}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId: activeProfileId })
            });
            const payload = await parseApiResponse(response);
            persistAuthenticatedSession(payload || {}, activeProfileId);
            navigateToApp();
            return true;
        } catch (refreshError) {
            console.warn('Failed to restore session:', refreshError);
            clearAuthenticatedSession();
            return false;
        }
    }, []);

    React.useEffect(() => {
        let cancelled = false;

        const init = async () => {
            const restored = await restoreSession();
            if (restored || cancelled) {
                return;
            }

            await loadProfiles();
        };

        init();

        return () => {
            cancelled = true;
        };
    }, [loadProfiles, restoreSession]);

    const switchProfile = React.useCallback(async (profileId, pin) => {
        setSwitchingProfileId(profileId);

        try {
            const response = await scopedFetch(`${API_BASE}/api/auth/switch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId, pin })
            });

            const payload = await parseApiResponse(response);
            persistAuthenticatedSession(payload || {}, profileId);

            setShowPinModal(false);
            setSelectedProfile(null);
            navigateToApp();
        } finally {
            setSwitchingProfileId(null);
        }
    }, []);

    const handleProfileClick = async (profile) => {
        if (switchingProfileId) {
            return;
        }

        if (profile.hasPin) {
            setSelectedProfile(profile);
            setShowPinModal(true);
            return;
        }

        try {
            await switchProfile(profile.id, null);
        } catch (switchError) {
            console.error('Error switching profile:', switchError);
            alert(`Failed to switch profile: ${switchError.message}`);
        }
    };

    const handlePinSubmit = async (pin) => {
        if (!selectedProfile) {
            return;
        }

        try {
            await switchProfile(selectedProfile.id, pin);
        } catch (switchError) {
            throw new Error(switchError.message || 'Failed to switch profile');
        }
    };

    const handlePinCancel = () => {
        setShowPinModal(false);
        setSelectedProfile(null);
    };

    const handleAddProfile = () => {
        setEditingProfile(null);
        setShowProfileModal(true);
    };

    const handleEditProfile = async (profile, event) => {
        event.stopPropagation();

        try {
            const response = await scopedFetch(`${API_BASE}/api/profiles/${profile.id}`);
            const details = await parseApiResponse(response);
            setEditingProfile(details || null);
            setShowProfileModal(true);
        } catch (loadError) {
            console.error('Error loading profile details:', loadError);
            alert(`Failed to load profile details: ${loadError.message}`);
        }
    };

    const handleProfileModalClose = () => {
        setShowProfileModal(false);
        setEditingProfile(null);
    };

    const handleSaveProfile = async ({ name, email, password, avatar, pin }) => {
        if (editingProfile) {
            const response = await scopedFetch(`${API_BASE}/api/profiles/${editingProfile.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, avatar, pin })
            });
            await parseApiResponse(response);
        } else {
            const response = await scopedFetch(`${API_BASE}/api/profiles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, avatar, pin })
            });
            await parseApiResponse(response);
        }

        setShowProfileModal(false);
        setEditingProfile(null);
        await loadProfiles();
    };

    const handleDeleteProfile = async (profileId) => {
        const response = await scopedFetch(`${API_BASE}/api/profiles/${profileId}`, {
            method: 'DELETE'
        });

        if (!response.ok && response.status !== 204) {
            await parseApiResponse(response);
        }

        setShowProfileModal(false);
        setEditingProfile(null);
        await loadProfiles();
    };

    if (loading) {
        return (
            <div className={styles['profile-selector-container']}>
                <div className={styles['loading']}>{t('PROFILE_LOADING')}</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles['profile-selector-container']}>
                <div className={styles['error']}>
                    <h2>{t('PROFILE_ERROR_LOADING')}</h2>
                    <p>{error}</p>
                    <button onClick={loadProfiles}>{t('RETRY')}</button>
                </div>
            </div>
        );
    }

    const enrichedProfiles = profiles.map((profile) => ({
        ...profile,
        avatarData: AVATAR_MAP[profile.avatar] || null
    }));

    return (
        <div className={styles['profile-selector-container']}>
            <div className={styles['header']}>
                <h1>{t('PROFILE_WHOS_WATCHING')}</h1>
                <p>{t('PROFILE_SELECT_CONTINUE')}</p>
            </div>

            <div className={styles['profile-grid']}>
                {enrichedProfiles.map((profile) => (
                    <ProfileCard
                        key={profile.id}
                        profile={profile}
                        onClick={handleProfileClick}
                        onEdit={handleEditProfile}
                    />
                ))}

                <div
                    className={styles['add-profile-card']}
                    onClick={handleAddProfile}
                    tabIndex={0}
                    role="button"
                    aria-label="Add new profile"
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleAddProfile();
                        }
                    }}
                >
                    <div className={styles['add-icon']}>+</div>
                    <div className={styles['add-text']}>{t('PROFILE_ADD')}</div>
                </div>
            </div>

            {showPinModal && selectedProfile && (
                <PinModal
                    profileName={selectedProfile.name}
                    onSubmit={handlePinSubmit}
                    onCancel={handlePinCancel}
                />
            )}

            {showProfileModal && (
                <ProfileModal
                    profile={editingProfile}
                    onSave={handleSaveProfile}
                    onDelete={editingProfile ? handleDeleteProfile : null}
                    onClose={handleProfileModalClose}
                />
            )}

            {switchingProfileId && <div className={styles['loading']}>{t('PROFILE_LOADING')}</div>}
        </div>
    );
};

module.exports = ProfileSelector;
