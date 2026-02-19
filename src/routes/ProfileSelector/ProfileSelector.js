// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useTranslation } = require('react-i18next');
const ProfileCard = require('./ProfileCard');
const PinModal = require('./PinModal');
const ProfileModal = require('./ProfileModal');
const { AVATAR_OPTIONS } = require('./ProfileModal');
const styles = require('./styles');

const API_BASE = typeof window !== 'undefined' && window.location.origin;

// Map avatar id → emoji for display
const AVATAR_MAP = AVATAR_OPTIONS.reduce((acc, a) => {
    acc[a.id] = a;
    acc[`${a.id}.png`] = a;
    return acc;
}, {});

const ProfileSelector = () => {
    const { t } = useTranslation();
    const [profiles, setProfiles] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    // Profile switching
    const [selectedProfile, setSelectedProfile] = React.useState(null);
    const [showPinModal, setShowPinModal] = React.useState(false);

    // Profile management
    const [showProfileModal, setShowProfileModal] = React.useState(false);
    const [editingProfile, setEditingProfile] = React.useState(null);

    // Load profiles on mount + auto-refresh authKey if a profile is already active
    React.useEffect(() => {
        checkAndRefreshAuth();
        loadProfiles();
    }, []);

    /**
     * If there is an already-active profile in localStorage, silently re-authenticate
     * to get a fresh authKey and redirect to the app without showing the selector.
     */
    const checkAndRefreshAuth = async () => {
        try {
            const stored = localStorage.getItem('profile');
            if (!stored) return;

            const parsed = JSON.parse(stored);
            const profileId = parsed?.profileInfo?.id;
            if (!profileId) return;

            const response = await fetch(`${API_BASE}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId })
            });

            if (!response.ok) {
                // Cannot refresh (credentials may have changed) — let the user pick again
                localStorage.removeItem('profile');
                return;
            }

            const data = await response.json();

            localStorage.setItem('profile', JSON.stringify({
                auth: { key: data.authKey, user: data.user },
                profileInfo: data.profile
            }));

            // Navigate to main app with fresh authKey
            window.location.href = '/';
        } catch (err) {
            // Non-critical: just show the profile selector normally
            console.warn('Auto-refresh failed:', err);
        }
    };

    const loadProfiles = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_BASE}/api/profiles`);
            if (!response.ok) {
                throw new Error('Failed to load profiles');
            }

            const data = await response.json();
            setProfiles(data);
        } catch (err) {
            console.error('Error loading profiles:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ---- Profile switching ----

    const handleProfileClick = (profile) => {
        if (profile.hasPin) {
            setSelectedProfile(profile);
            setShowPinModal(true);
        } else {
            switchProfile(profile.id, null);
        }
    };

    const handlePinSubmit = async (pin) => {
        if (selectedProfile) {
            // Verify PIN first — throws on failure so PinModal can show inline error
            const verifyRes = await fetch(`${API_BASE}/api/auth/verify-pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileId: selectedProfile.id, pin })
            });

            if (!verifyRes.ok) {
                throw new Error('Incorrect PIN. Please try again.');
            }

            await switchProfile(selectedProfile.id, pin);
        }
    };

    const handlePinCancel = () => {
        setShowPinModal(false);
        setSelectedProfile(null);
    };

    const switchProfile = async (profileId, pin) => {
        try {
            const response = await fetch(`${API_BASE}/api/auth/switch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ profileId, pin })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to switch profile');
            }

            const data = await response.json();

            // Store auth data in localStorage for Stremio core to pick up
            localStorage.setItem('profile', JSON.stringify({
                auth: {
                    key: data.authKey,
                    user: data.user
                },
                profileInfo: data.profile
            }));

            // Close PIN modal if open
            setShowPinModal(false);
            setSelectedProfile(null);

            // Reload the page so Stremio core initializes with the new authKey
            window.location.reload();
        } catch (err) {
            console.error('Error switching profile:', err);
            alert(`Failed to switch profile: ${err.message}`);
            setShowPinModal(false);
            setSelectedProfile(null);
        }
    };

    // ---- Profile management (Phase 4) ----

    const handleAddProfile = () => {
        setEditingProfile(null);
        setShowProfileModal(true);
    };

    const handleEditProfile = async (profile, e) => {
        e.stopPropagation();
        try {
            const response = await fetch(`${API_BASE}/api/profiles/${profile.id}`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to load profile details');
            }

            const details = await response.json();
            setEditingProfile(details);
            setShowProfileModal(true);
        } catch (err) {
            console.error('Error loading profile details:', err);
            alert(`Failed to load profile details: ${err.message}`);
        }
    };

    const handleProfileModalClose = () => {
        setShowProfileModal(false);
        setEditingProfile(null);
    };

    const handleSaveProfile = async ({ name, email, password, avatar, pin }) => {
        if (editingProfile) {
            // Update existing profile
            const response = await fetch(`${API_BASE}/api/profiles/${editingProfile.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, avatar, pin })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to update profile');
            }
        } else {
            // Create new profile
            const response = await fetch(`${API_BASE}/api/profiles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, avatar, pin })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to create profile');
            }
        }

        setShowProfileModal(false);
        setEditingProfile(null);
        await loadProfiles();
    };

    const handleDeleteProfile = async (profileId) => {
        const response = await fetch(`${API_BASE}/api/profiles/${profileId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to delete profile');
        }

        setShowProfileModal(false);
        setEditingProfile(null);
        await loadProfiles();
    };

    // ---- Render ----

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

    // Enrich profiles with avatar data
    const enrichedProfiles = profiles.map((p) => ({
        ...p,
        avatarData: AVATAR_MAP[p.avatar] || null
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
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
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
        </div>
    );
};

module.exports = ProfileSelector;
