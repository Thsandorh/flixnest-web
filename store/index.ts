import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types
export interface Addon {
  id: string;
  name: string;
  manifest: string;
  version: string;
  description?: string;
  types: string[];
  catalogs?: string[];
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
  progress: number; // Current time in seconds
  duration: number; // Total duration in seconds
  lastWatchedAt: number; // Unix timestamp
  watchedEpisodes?: Record<string, boolean>; // "s1e1" -> true format
}

export interface WatchlistItem {
  id: string;
  type: 'movie' | 'tv';
  title: string;
  poster: string;
  backdrop?: string;
  addedAt: number;
}

// Addon Store
interface AddonState {
  addons: Addon[];
  activeAddon: Addon | null;
  addAddon: (addon: Addon) => void;
  removeAddon: (id: string) => void;
  setActiveAddon: (addon: Addon | null) => void;
  getAddonByManifest: (manifest: string) => Addon | undefined;
}

const DEFAULT_ADDON: Addon = {
  id: 'webstreamr',
  name: 'WebStreamr',
  manifest: 'https://webstreamr.hayd.uk/manifest.json',
  version: '1.0.0',
  description: 'High-quality web streams',
  types: ['movie', 'series'],
};

export const useAddonStore = create<AddonState>()(
  persist(
    (set, get) => ({
      addons: [DEFAULT_ADDON],
      activeAddon: DEFAULT_ADDON,

      addAddon: (addon) =>
        set((state) => {
          const exists = state.addons.some((a) => a.manifest === addon.manifest);
          if (exists) return state;
          return { addons: [...state.addons, addon] };
        }),

      removeAddon: (id) =>
        set((state) => ({
          addons: state.addons.filter((a) => a.id !== id),
          activeAddon:
            state.activeAddon?.id === id ? state.addons[0] || null : state.activeAddon,
        })),

      setActiveAddon: (addon) => set({ activeAddon: addon }),

      getAddonByManifest: (manifest) => get().addons.find((a) => a.manifest === manifest),
    }),
    {
      name: 'flixnest-addons',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// History Store
interface HistoryState {
  history: HistoryItem[];

  // Actions
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

      updateProgress: (item) =>
        set((state) => {
          const existingIndex = state.history.findIndex((h) => h.id === item.id);
          const newItem: HistoryItem = {
            ...item,
            lastWatchedAt: Date.now(),
          };

          // For TV shows, preserve watched episodes
          if (existingIndex >= 0 && item.type === 'tv') {
            newItem.watchedEpisodes = {
              ...state.history[existingIndex].watchedEpisodes,
              ...item.watchedEpisodes,
            };
          }

          if (existingIndex >= 0) {
            const updated = [...state.history];
            updated[existingIndex] = newItem;
            // Sort by last watched
            updated.sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
            return { history: updated };
          }

          return {
            history: [newItem, ...state.history],
          };
        }),

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
        const item = get().history.find((h) => h.id === id);

        // If current episode is not the last of the season
        if (currentEpisode < totalEpisodes) {
          return { season: currentSeason, episode: currentEpisode + 1 };
        }

        // If there are more seasons
        if (currentSeason < totalSeasons) {
          return { season: currentSeason + 1, episode: 1 };
        }

        // No more episodes
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
        } else {
          get().addToWatchlist(item);
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

// UI Store (non-persisted)
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
