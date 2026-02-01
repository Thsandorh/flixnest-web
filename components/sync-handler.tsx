'use client';

import { useEffect } from 'react';
import { useAuthStore, useAddonStore, useHistoryStore, useWatchlistStore } from '@/store';

export function SyncHandler() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const syncData = useAuthStore((state) => state.syncData);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Debounced sync function
    let timeoutId: NodeJS.Timeout;
    const debouncedSync = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        syncData();
      }, 2000); // Wait 2 seconds of inactivity before syncing
    };

    // Subscribe to changes in all relevant stores
    const unsubAddons = useAddonStore.subscribe(debouncedSync);
    const unsubHistory = useHistoryStore.subscribe(debouncedSync);
    const unsubWatchlist = useWatchlistStore.subscribe(debouncedSync);

    return () => {
      unsubAddons();
      unsubHistory();
      unsubWatchlist();
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, syncData]);

  return null;
}
