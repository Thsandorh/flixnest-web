// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { Intro, ProfileSelector } = require('stremio/routes');
const { useProfile } = require('stremio/common');

const withProtectedRoutes = (Component) => {
    return function withProtectedRoutes(props) {
        const profile = useProfile();
        const previousAuthRef = React.useRef(profile.auth);
        React.useEffect(() => {
            if (previousAuthRef.current !== null && profile.auth === null) {
                // Redirect to profile selector instead of intro when logged out
                window.location = '#/profile-selector';
            }
            previousAuthRef.current = profile.auth;
        }, [profile]);
        const onRouteChange = React.useCallback((routeConfig) => {
            // If authenticated and trying to access Intro or ProfileSelector, redirect to Board
            if (profile.auth !== null && (routeConfig.component === Intro || routeConfig.component === ProfileSelector)) {
                window.location.replace('#/');
                return true;
            }
            // If not authenticated, always redirect to ProfileSelector (replaces Intro as entry point)
            if (profile.auth === null && routeConfig.component !== ProfileSelector) {
                window.location.replace('#/profile-selector');
                return true;
            }
        }, [profile]);
        return (
            <Component {...props} onRouteChange={onRouteChange} />
        );
    };
};

module.exports = withProtectedRoutes;
