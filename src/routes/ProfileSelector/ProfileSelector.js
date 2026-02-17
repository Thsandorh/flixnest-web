// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const ProfileCard = require('./ProfileCard');
const PinModal = require('./PinModal');
const styles = require('./styles');

const API_BASE = typeof window !== 'undefined' && window.location.origin;

const ProfileSelector = () => {
    const [profiles, setProfiles] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [selectedProfile, setSelectedProfile] = React.useState(null);
    const [showPinModal, setShowPinModal] = React.useState(false);

    // Load profiles on mount
    React.useEffect(() => {
        loadProfiles();
    }, []);

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

    const handleProfileClick = (profile) => {
        if (profile.hasPin) {
            setSelectedProfile(profile);
            setShowPinModal(true);
        } else {
            switchProfile(profile.id, null);
        }
    };

    const handlePinSubmit = (pin) => {
        if (selectedProfile) {
            switchProfile(selectedProfile.id, pin);
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

            // Store auth data in localStorage
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

            // Reload the page to initialize Stremio with the new profile
            window.location.reload();
        } catch (err) {
            console.error('Error switching profile:', err);
            if (err.message.includes('PIN')) {
                // Invalid PIN - shake the input
                alert('Invalid PIN. Please try again.');
            } else {
                alert(`Failed to switch profile: ${err.message}`);
            }
            setShowPinModal(false);
            setSelectedProfile(null);
        }
    };

    const handleAddProfile = () => {
        // TODO: Open add profile modal
        alert('Add profile functionality will be implemented in Phase 4');
    };

    const handleManageProfiles = () => {
        // TODO: Open profile management UI
        alert('Manage profiles functionality will be implemented in Phase 4');
    };

    if (loading) {
        return (
            <div className={styles['profile-selector-container']}>
                <div className={styles['loading']}>Loading profiles...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles['profile-selector-container']}>
                <div className={styles['error']}>
                    <h2>Error Loading Profiles</h2>
                    <p>{error}</p>
                    <button onClick={loadProfiles}>Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles['profile-selector-container']}>
            <div className={styles['header']}>
                <h1>Who's watching?</h1>
                <p>Select your profile to continue</p>
            </div>

            <div className={styles['profile-grid']}>
                {profiles.map((profile) => (
                    <ProfileCard
                        key={profile.id}
                        profile={profile}
                        onClick={handleProfileClick}
                    />
                ))}

                <div
                    className={styles['add-profile-card']}
                    onClick={handleAddProfile}
                    tabIndex={0}
                    role="button"
                    aria-label="Add new profile"
                >
                    <div className={styles['add-icon']}>+</div>
                    <div className={styles['add-text']}>Add Profile</div>
                </div>
            </div>

            <button className={styles['manage-profiles-btn']} onClick={handleManageProfiles}>
                Manage Profiles
            </button>

            {showPinModal && selectedProfile && (
                <PinModal
                    profileName={selectedProfile.name}
                    onSubmit={handlePinSubmit}
                    onCancel={handlePinCancel}
                />
            )}
        </div>
    );
};

module.exports = ProfileSelector;
