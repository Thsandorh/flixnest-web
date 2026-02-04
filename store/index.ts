import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { syncTraktHistoryIfNeeded, syncTraktWatchlist } from '@/lib/trakt';

// Types
export interface Addon {
  id: string;
  name: string;
  manifest: string;
  version: string;
  description?: string;
  types: string[];
  catalogs?: string[];
  resources?: string[];
}

export interface HistoryItem {
  id: string;
  imdbId?: string;
  type: 'movie' | 'tv';
  title: string;
  poster: string;
  backdrop?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  progress: number;
  duration: number;
  lastWatchedAt: number;
  watchedEpisodes?: Record<string, boolean>;
}

export interface WatchlistItem {
  id: string;
  type: 'movie' | 'tv';
  title: string;
  poster: string;
  backdrop?: string;
  addedAt: number;
  imdbId?: string;
}

const SUBMAKER_MANIFEST_HINT = 'submaker.elfhosted.com';
const BLOCKED_MANIFEST_HOSTS = new Set<string>();
const REMOVED_ADDON_MANIFESTS = new Set<string>();

const isBlockedManifest = (manifest?: string): boolean => {
  if (!manifest) return false;
  if (REMOVED_ADDON_MANIFESTS.has(manifest)) return true;
  try {
    const host = new URL(manifest).hostname.toLowerCase();
    return BLOCKED_MANIFEST_HOSTS.has(host);
  } catch {
    return false;
  }
};

const normalizeAddon = (addon: Addon): Addon => {
  if (!addon.manifest) return addon;
  if (!addon.manifest.includes(SUBMAKER_MANIFEST_HINT)) return addon;

  if (addon.resources && addon.resources.length > 0) {
    return addon;
  }

  return {
    ...addon,
    resources: ['subtitles'],
  };
};


// Default addons - all active by default
const DEFAULT_ADDONS: Addon[] = [
  {
    id: 'webstreamr',
    name: 'WebStreamr',
    manifest: 'https://webstreamr.hayd.uk/manifest.json',
    version: '1.0.0',
    description: 'High-quality web streams',
    types: ['movie', 'series'],
  },
  {
    id: 'nuviostreams',
    name: 'NuvioStreams',
    manifest:
      'https://nuviostreams.hayd.uk/providers=showbox,vidzee,vidsrc,vixsrc,mp4hydra,uhdmovies,moviesdrive,4khdhub,hdhub4u,topmovies/manifest.json',
    version: '1.0.0',
    description: 'Nuvio streaming service',
    types: ['movie', 'series'],
  },
  {
    id: 'usatv',
    name: 'USA TV',
    manifest: 'https://848b3516657c-usatv.baby-beamup.club/manifest.json',
    version: '1.0.0',
    description: 'USA TV catalog addon',
    types: ['tv'],
    resources: ['catalog', 'stream'],
  },
  {
    id: 'submaker',
    name: 'SubMaker',
    manifest: 'https://submaker.elfhosted.com/addon/e1f195feeb10907f481697054dc902f6/manifest.json',
    version: '1.0.0',
    description: 'Subtitle provider',
    types: ['movie', 'series'],
    resources: ['subtitles'],
  },
  {
    id: 'netflix-catalog',
    name: 'Netflix Catalog',
    manifest: 'https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club/manifest.json',
    version: '1.0.0',
    description: 'Netflix catalog addon',
    types: ['movie', 'series'],
    resources: ['catalog'],
  },
];

const DEFAULT_ADDONS_NORMALIZED = DEFAULT_ADDONS.map(normalizeAddon);

const filterRemovedAddons = (addons: Addon[]): Addon[] =>
  addons.filter((addon) => !isBlockedManifest(addon.manifest));

const mergeDefaultAddons = (addons: Addon[]): Addon[] => {
  const merged = filterRemovedAddons(addons.map(normalizeAddon));
  const seen = new Set(merged.map((addon) => addon.manifest));

  for (const addon of DEFAULT_ADDONS_NORMALIZED) {
    if (seen.has(addon.manifest)) continue;
    merged.push(addon);
    seen.add(addon.manifest);
  }

  return merged;
};

const ensureUniqueAddonIds = (addons: Addon[]): Addon[] => {
  const seen = new Set<string>();
  const result: Addon[] = [];

  for (const addon of addons) {
    let uniqueId = addon.id;
    let counter = 1;

    // If ID already exists, append a number to make it unique
    while (seen.has(uniqueId)) {
      uniqueId = `${addon.id}-${counter}`;
      counter++;
    }

    seen.add(uniqueId);
    result.push(uniqueId === addon.id ? addon : { ...addon, id: uniqueId });
  }

  return result;
};

const filterActiveAddons = (addons: Addon[], activeAddons: Addon[]): Addon[] => {
  const byId = new Map(addons.map((addon) => [addon.id, addon]));
  const byManifest = new Map(addons.map((addon) => [addon.manifest, addon]));
  const seen = new Set<string>();
  const filtered: Addon[] = [];

  for (const addon of activeAddons) {
    const match = byId.get(addon.id) || byManifest.get(addon.manifest);
    if (!match || seen.has(match.id)) continue;
    filtered.push(match);
    seen.add(match.id);
  }

  return filtered;
};

// Auth Store
export interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, token: string, user: User) => void;
  logout: () => void;
  syncData: () => Promise<void>;
  fetchUserData: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (email, token, user) => {
        set({ user, token, isAuthenticated: true });
        get().fetchUserData();
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        // Optionally clear other stores on logout
        useAddonStore.getState().reset();
        useHistoryStore.getState().clearHistory();
        useWatchlistStore.getState().clearWatchlist();
      },
      syncData: async () => {
        const { token, isAuthenticated } = get();
        if (!isAuthenticated || !token) return;

        const addons = useAddonStore.getState().addons;
        const watchlist = useWatchlistStore.getState().watchlist;
        const history = useHistoryStore.getState().history;

        try {
          await fetch('/api/user/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ addons, watchlist, history }),
          });
        } catch (error) {
          console.error('Failed to sync data:', error);
        }
      },
      fetchUserData: async () => {
        const { token, isAuthenticated } = get();
        if (!isAuthenticated || !token) return;

        try {
          const response = await fetch('/api/user/data', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Expected JSON but got:', text.substring(0, 100));
            return;
          }

          const data = await response.json();
          if (response.ok) {
            if (data.addons) {
              const mergedAddons = mergeDefaultAddons(data.addons);
              const activeAddons = filterActiveAddons(
                mergedAddons,
                data.addons.length > 0 ? data.addons : mergedAddons
              );
              useAddonStore.setState({ addons: mergedAddons, activeAddons });
            }
            if (data.watchlist) useWatchlistStore.setState({ watchlist: data.watchlist });
            if (data.history) useHistoryStore.setState({ history: data.history });
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
        }
      },
    }),
    {
      name: 'flixnest-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Addon Store - supports multiple active addons
interface AddonState {
  addons: Addon[];
  activeAddons: Addon[];
  addAddon: (addon: Addon) => void;
  removeAddon: (id: string) => void;
  toggleAddonActive: (id: string) => void;
  isAddonActive: (id: string) => boolean;
  getAddonByManifest: (manifest: string) => Addon | undefined;
  reset: () => void;
}

export const useAddonStore = create<AddonState>()(
  persist(
    (set, get) => ({
      addons: DEFAULT_ADDONS_NORMALIZED,
      activeAddons: DEFAULT_ADDONS_NORMALIZED,

      reset: () => set({ addons: DEFAULT_ADDONS_NORMALIZED, activeAddons: DEFAULT_ADDONS_NORMALIZED }),

      addAddon: (addon) =>
        set((state) => {
          const normalized = normalizeAddon(addon);
          if (isBlockedManifest(normalized.manifest)) {
            return state;
          }
          const exists = state.addons.some((a) => a.manifest === normalized.manifest);
          if (exists) return state;
          const nextAddons = ensureUniqueAddonIds([...state.addons, normalized]);
          const nextActive = filterActiveAddons(nextAddons, [...state.activeAddons, normalized]);
          return {
            addons: nextAddons,
            activeAddons: nextActive,
          };
        }),

      removeAddon: (id) =>
        set((state) => {
          const nextAddons = state.addons.filter((a) => a.id !== id);
          const nextActive = filterActiveAddons(
            nextAddons,
            state.activeAddons.filter((a) => a.id !== id)
          );
          return {
            addons: nextAddons,
            activeAddons: nextActive,
          };
        }),

      toggleAddonActive: (id) =>
        set((state) => {
          const addon = state.addons.find((a) => a.id === id);
          if (!addon) return state;

          const isActive = state.activeAddons.some((a) => a.id === id);
          if (isActive) {
            const nextActive = filterActiveAddons(
              state.addons,
              state.activeAddons.filter((a) => a.id !== id)
            );
            return {
              activeAddons: nextActive,
            };
          }

          const nextActive = filterActiveAddons(
            state.addons,
            [...state.activeAddons, addon]
          );
          return {
            activeAddons: nextActive,
          };
        }),

      isAddonActive: (id) => get().activeAddons.some((a) => a.id === id),

      getAddonByManifest: (manifest) => get().addons.find((a) => a.manifest === manifest),
    }),
    {
      name: 'flixnest-addons',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        if (!persistedState) return currentState;

        const persisted = persistedState as Partial<AddonState>;
        const hasPersistedAddons = Array.isArray(persisted.addons);
        const hasPersistedActive = Array.isArray(persisted.activeAddons);

        const baseAddons = hasPersistedAddons ? persisted.addons ?? [] : currentState.addons;
        const mergedAddons = mergeDefaultAddons(baseAddons);
        const baseActive = hasPersistedActive ? persisted.activeAddons ?? [] : currentState.activeAddons;
        const filteredActive = filterActiveAddons(mergedAddons, filterRemovedAddons(baseActive));
        const knownManifests = new Set(baseAddons.map((addon) => addon.manifest));
        const newlyAddedDefaults = mergedAddons.filter((addon) => !knownManifests.has(addon.manifest));
        const nextActive = filterActiveAddons(mergedAddons, [...filteredActive, ...newlyAddedDefaults]);

        return {
          ...currentState,
          ...persisted,
          addons: mergedAddons,
          activeAddons: nextActive,
        };
      },
    }
  )
);

// History Store
interface HistoryState {
  history: HistoryItem[];
  updateProgress: (item: Omit<HistoryItem, 'lastWatchedAt'>) => void;
  markEpisodeWatched: (id: string, season: number, episode: number) => void;
  isEpisodeWatched: (id: string, season: number, episode: number) => boolean;
  getEpisodeProgress: (id: string, season: number, episode: number) => number;
  getItemById: (id: string) => HistoryItem | undefined;
  getProgressPercentage: (item: HistoryItem) => number;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  getNextEpisode: (id: string, currentSeason: number, currentEpisode: number, totalEpisodes: number, totalSeasons: number) => { season: number; episode: number } | null;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      history: [],

      updateProgress: (item) => {
        set((state) => {
          const existingIndex = state.history.findIndex((h) => h.id === item.id);
          const newItem: HistoryItem = {
            ...item,
            lastWatchedAt: Date.now(),
          };

          if (existingIndex >= 0 && item.type === 'tv') {
            newItem.watchedEpisodes = {
              ...state.history[existingIndex].watchedEpisodes,
              ...item.watchedEpisodes,
            };
          }

          if (existingIndex >= 0) {
            const updated = [...state.history];
            updated[existingIndex] = newItem;
            updated.sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
            return { history: updated };
          }

          return {
            history: [newItem, ...state.history],
          };
        });

        const traktToken = useTraktStore.getState().accessToken;
        if (traktToken) {
          const progressPercent =
            item.duration > 0 ? (item.progress / item.duration) * 100 : 0;
          void syncTraktHistoryIfNeeded(
            traktToken,
            {
              id: item.id,
              type: item.type,
              imdbId: item.imdbId,
              season: item.season,
              episode: item.episode,
            },
            progressPercent
          ).catch(() => {});
        }
      },

      markEpisodeWatched: (id, season, episode) =>
        set((state) => {
          const key = `s${season}e${episode}`;
          const existingIndex = state.history.findIndex((h) => h.id === id);

          if (existingIndex >= 0) {
            const updated = [...state.history];
            updated[existingIndex] = {
              ...updated[existingIndex],
              watchedEpisodes: {
                ...updated[existingIndex].watchedEpisodes,
                [key]: true,
              },
              lastWatchedAt: Date.now(),
            };
            return { history: updated };
          }
          return state;
        }),

      isEpisodeWatched: (id, season, episode) => {
        const item = get().history.find((h) => h.id === id);
        if (!item?.watchedEpisodes) return false;
        return item.watchedEpisodes[`s${season}e${episode}`] === true;
      },

      getEpisodeProgress: (id, season, episode) => {
        const item = get().history.find((h) => h.id === id);
        if (!item || item.season !== season || item.episode !== episode) return 0;
        return item.duration > 0 ? (item.progress / item.duration) * 100 : 0;
      },

      getItemById: (id) => get().history.find((h) => h.id === id),

      getProgressPercentage: (item) => {
        if (!item.duration || item.duration === 0) return 0;
        return Math.min((item.progress / item.duration) * 100, 100);
      },

      removeFromHistory: (id) =>
        set((state) => ({
          history: state.history.filter((h) => h.id !== id),
        })),

      clearHistory: () => set({ history: [] }),

      getNextEpisode: (id, currentSeason, currentEpisode, totalEpisodes, totalSeasons) => {
        if (currentEpisode < totalEpisodes) {
          return { season: currentSeason, episode: currentEpisode + 1 };
        }
        if (currentSeason < totalSeasons) {
          return { season: currentSeason + 1, episode: 1 };
        }
        return null;
      },
    }),
    {
      name: 'flixnest-history',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Watchlist Store
interface WatchlistState {
  watchlist: WatchlistItem[];
  addToWatchlist: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  removeFromWatchlist: (id: string) => void;
  isInWatchlist: (id: string) => boolean;
  toggleWatchlist: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  clearWatchlist: () => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      watchlist: [],

      addToWatchlist: (item) =>
        set((state) => {
          if (state.watchlist.some((w) => w.id === item.id)) return state;
          return {
            watchlist: [{ ...item, addedAt: Date.now() }, ...state.watchlist],
          };
        }),

      removeFromWatchlist: (id) =>
        set((state) => ({
          watchlist: state.watchlist.filter((w) => w.id !== id),
        })),

      isInWatchlist: (id) => get().watchlist.some((w) => w.id === id),

      toggleWatchlist: (item) => {
        const isIn = get().isInWatchlist(item.id);
        if (isIn) {
          get().removeFromWatchlist(item.id);
          const traktToken = useTraktStore.getState().accessToken;
          if (traktToken) {
            void syncTraktWatchlist(
              traktToken,
              { id: item.id, type: item.type, imdbId: item.imdbId },
              'remove'
            ).catch(() => {});
          }
        } else {
          get().addToWatchlist(item);
          const traktToken = useTraktStore.getState().accessToken;
          if (traktToken) {
            void syncTraktWatchlist(
              traktToken,
              { id: item.id, type: item.type, imdbId: item.imdbId },
              'add'
            ).catch(() => {});
          }
        }
      },

      clearWatchlist: () => set({ watchlist: [] }),
    }),
    {
      name: 'flixnest-watchlist',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export interface AppNotification {
  id: string;
  key?: string;
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  createdAt: number;
  read: boolean;
}

interface TraktState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  username: string | null;
  setTokens: (data: { accessToken: string; refreshToken: string; expiresAt: number; username?: string }) => void;
  clearTokens: () => void;
}

export const useTraktStore = create<TraktState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      username: null,
      setTokens: ({ accessToken, refreshToken, expiresAt, username }) =>
        set({
          accessToken,
          refreshToken,
          expiresAt,
          username: username ?? null,
        }),
      clearTokens: () =>
        set({
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          username: null,
        }),
    }),
    {
      name: 'flixnest-trakt',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      addNotification: (notification) =>
        set((state) => {
          if (notification.key && state.notifications.some((item) => item.key === notification.key)) {
            return state;
          }
          const id =
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          const next: AppNotification = {
            ...notification,
            id,
            createdAt: Date.now(),
            read: false,
          };
          return { notifications: [next, ...state.notifications].slice(0, 50) };
        }),
      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id ? { ...item, read: true } : item
          ),
        })),
      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.read ? item : { ...item, read: true }
          ),
        })),
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'flixnest-notifications',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// UI Store
interface UIState {
  isMobile: boolean;
  isPlayerFullscreen: boolean;
  setIsMobile: (value: boolean) => void;
  setIsPlayerFullscreen: (value: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMobile: false,
  isPlayerFullscreen: false,
  setIsMobile: (value) => set({ isMobile: value }),
  setIsPlayerFullscreen: (value) => set({ isPlayerFullscreen: value }),
}));

// Settings Store
export interface SubtitlePreference {
  language: string; // ISO 639-1 code (e.g., 'en', 'hu', 'es')
  enabled: boolean;
}

interface SettingsState {
  autoSelectSubtitles: boolean;
  preferredSubtitleLanguages: string[]; // Ordered list of preferred languages
  setAutoSelectSubtitles: (value: boolean) => void;
  setPreferredSubtitleLanguages: (languages: string[]) => void;
  addPreferredLanguage: (language: string) => void;
  removePreferredLanguage: (language: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      autoSelectSubtitles: true,
      preferredSubtitleLanguages: ['en'], // Default to English

      setAutoSelectSubtitles: (value) => set({ autoSelectSubtitles: value }),

      setPreferredSubtitleLanguages: (languages) =>
        set({ preferredSubtitleLanguages: languages }),

      addPreferredLanguage: (language) =>
        set((state) => {
          if (state.preferredSubtitleLanguages.includes(language)) return state;
          return {
            preferredSubtitleLanguages: [...state.preferredSubtitleLanguages, language],
          };
        }),

      removePreferredLanguage: (language) =>
        set((state) => ({
          preferredSubtitleLanguages: state.preferredSubtitleLanguages.filter(
            (lang) => lang !== language
          ),
        })),
    }),
    {
      name: 'flixnest-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
