// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const { useTranslation } = require('react-i18next');
const styles = require('./styles');

const ProfileCard = ({ profile, onClick, onEdit }) => {
    const { t } = useTranslation();
    const getInitials = (name) => {
        return name
            .split(' ')
            .map((word) => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(profile);
        }
    };

    return (
        <div
            className={styles['profile-card']}
            onClick={() => onClick(profile)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label={`Select profile ${profile.name}`}
        >
            <div className={styles['avatar']}>
                {profile.avatarData ? (
                    <span>{profile.avatarData.emoji}</span>
                ) : profile.avatar && profile.avatar.startsWith('http') ? (
                    <img src={profile.avatar} alt={profile.name} />
                ) : (
                    getInitials(profile.name)
                )}
            </div>
            <div className={styles['name']}>{profile.name}</div>
            {profile.hasPin && <div className={styles['pin-indicator']}>{t('PROFILE_PROTECTED')}</div>}
            {onEdit && (
                <button
                    type="button"
                    className={styles['edit-btn']}
                    onClick={(e) => onEdit(profile, e)}
                >
                    {t('PROFILE_EDIT')}
                </button>
            )}
        </div>
    );
};

ProfileCard.propTypes = {
    profile: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        avatar: PropTypes.string,
        hasPin: PropTypes.bool,
        avatarData: PropTypes.shape({
            emoji: PropTypes.string
        })
    }).isRequired,
    onClick: PropTypes.func.isRequired,
    onEdit: PropTypes.func
};

module.exports = ProfileCard;
