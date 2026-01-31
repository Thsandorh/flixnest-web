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
}

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
    id: 'flixnest-webstreamr',
    name: 'FlixNest WebStreamr',
    manifest: 'https://flixnest.app/addon/webstreamr/manifest.json',
    version: '1.0.0',
    description: 'FlixNest streaming addon',
    types: ['movie', 'series'],
  },
  {
    id: 'nuviostreams',
    name: 'NuvioStreams',
    manifest: 'https://nuviostreams.hayd.uk/manifest.json',
    version: '1.0.0',
    description: 'Nuvio streaming service',
    types: ['movie', 'series'],
  },
];

// Addon Store - supports multiple active addons
interface AddonState {
  addons: Addon[];
  activeAddons: Addon[];
  addAddon: (addon: Addon) => void;
  removeAddon: (id: string) => void;
  toggleAddonActive: (id: string) => void;
  isAddonActive: (id: string) => boolean;
  getAddonByManifest: (manifest: string) => Addon | undefined;
}

export const useAddonStore = create<AddonState>()(
  persist(
    (set, get) => ({
      addons: DEFAULT_ADDONS,
      activeAddons: DEFAULT_ADDONS,

      addAddon: (addon) =>
        set((state) => {
          const exists = state.addons.some((a) => a.manifest === addon.manifest);
          if (exists) return state;
          return {
            addons: [...state.addons, addon],
            activeAddons: [...state.activeAddons, addon],
          };
        }),

      removeAddon: (id) =>
        set((state) => ({
          addons: state.addons.filter((a) => a.id !== id),
          activeAddons: state.activeAddons.filter((a) => a.id !== id),
        })),

      toggleAddonActive: (id) =>
        set((state) => {
          const addon = state.addons.find((a) => a.id === id);
          if (!addon) return state;

          const isActive = state.activeAddons.some((a) => a.id === id);
          if (isActive) {
            return {
              activeAddons: state.activeAddons.filter((a) => a.id !== id),
            };
          } else {
            return {
              activeAddons: [...state.activeAddons, addon],
            };
          }
        }),

      isAddonActive: (id) => get().activeAddons.some((a) => a.id === id),

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
