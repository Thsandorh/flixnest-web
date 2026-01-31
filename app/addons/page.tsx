'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  Zap,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAddonStore, type Addon } from '@/store';
import { getManifest } from '@/lib/stremio';

const POPULAR_ADDONS = [
  {
    name: 'WebStreamr',
    manifest: 'https://webstreamr.strem.fun/manifest.json',
    description: 'High-quality web streams for movies and series',
  },
  {
    name: 'Torrentio',
    manifest: 'https://torrentio.strem.fun/manifest.json',
    description: 'Torrent streams from various providers',
  },
  {
    name: 'Comet',
    manifest: 'https://comet.elfhosted.com/manifest.json',
    description: 'Real-Debrid enhanced streams',
  },
  {
    name: 'MediaFusion',
    manifest: 'https://mediafusion.elfhosted.com/manifest.json',
    description: 'Multiple stream sources combined',
  },
];

export default function AddonsPage() {
  const [manifestUrl, setManifestUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addons, activeAddons, addAddon, removeAddon, toggleAddonActive, isAddonActive, getAddonByManifest } =
    useAddonStore();

  const handleAddAddon = async (url?: string) => {
    const urlToAdd = url || manifestUrl;

    if (!urlToAdd.trim()) {
      setError('Please enter a manifest URL');
      return;
    }

    try {
      new URL(urlToAdd);
    } catch {
      setError('Invalid URL format');
      return;
    }

    if (getAddonByManifest(urlToAdd)) {
      toast.info('Addon already installed');
      setManifestUrl('');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const manifest = await getManifest(urlToAdd);

      if (!manifest) {
        throw new Error('Failed to fetch manifest');
      }

      const newAddon: Addon = {
        id: manifest.id || urlToAdd,
        name: manifest.name,
        manifest: urlToAdd,
        version: manifest.version,
        description: manifest.description,
        types: manifest.types || [],
        catalogs: manifest.catalogs?.map((c) => c.name),
      };

      addAddon(newAddon);
      setManifestUrl('');
      toast.success(`${manifest.name} added successfully!`);
    } catch (err) {
      console.error('Error adding addon:', err);
      setError('Failed to add addon. Please check the URL and try again.');
      toast.error('Failed to add addon');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAddon = (addon: Addon) => {
    if (addons.length <= 1) {
      toast.error('You must have at least one addon installed');
      return;
    }

    removeAddon(addon.id);
    toast.success(`${addon.name} removed`);
  };

  const handleToggleActive = (addon: Addon) => {
    toggleAddonActive(addon.id);
    const willBeActive = !isAddonActive(addon.id);
    toast.success(willBeActive ? `${addon.name} enabled` : `${addon.name} disabled`);
  };

  return (
    <main className="min-h-screen bg-zinc-950 pt-20 pb-24">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-red-600/20 rounded-xl">
            <Puzzle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Addons</h1>
            <p className="text-zinc-400">
              {activeAddons.length} active addon(s)
            </p>
          </div>
        </div>

        {/* Add Addon Form */}
        <div className="bg-zinc-900 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            Add Custom Addon
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              placeholder="Enter manifest URL (e.g., https://addon.example/manifest.json)"
              value={manifestUrl}
              onChange={(e) => {
                setManifestUrl(e.target.value);
                setError(null);
              }}
              className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:border-red-500 transition-colors"
            />
            <button
              onClick={() => handleAddAddon()}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              Add
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 mt-3 text-red-400"
              >
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Popular Addons */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Popular Addons
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {POPULAR_ADDONS.map((addon) => {
              const isInstalled = getAddonByManifest(addon.manifest);

              return (
                <motion.div
                  key={addon.manifest}
                  className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 hover:border-zinc-700 transition-colors"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white">{addon.name}</h3>
                    {isInstalled ? (
                      <span className="flex items-center gap-1 text-xs text-green-500">
                        <Check className="w-3 h-3" />
                        Installed
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-zinc-400 mb-3">
                    {addon.description}
                  </p>
                  {!isInstalled && (
                    <button
                      onClick={() => handleAddAddon(addon.manifest)}
                      disabled={isLoading}
                      className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Quick Install
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Installed Addons */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Installed Addons ({addons.length})
          </h2>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {addons.map((addon) => {
                const isActive = isAddonActive(addon.id);

                return (
                  <motion.div
                    key={addon.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`bg-zinc-900 rounded-xl p-4 border transition-colors ${
                      isActive
                        ? 'border-green-500/50 bg-green-500/5'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white truncate">
                            {addon.name}
                          </h3>
                          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                            v{addon.version}
                          </span>
                          {isActive && (
                            <span className="text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </div>

                        {addon.description && (
                          <p className="text-sm text-zinc-400 mb-2 line-clamp-2">
                            {addon.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {addon.types.map((type) => (
                            <span
                              key={type}
                              className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleActive(addon)}
                          className={`p-2 rounded-lg transition-colors ${
                            isActive
                              ? 'text-green-400 hover:bg-green-500/20'
                              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                          }`}
                          title={isActive ? 'Disable addon' : 'Enable addon'}
                        >
                          {isActive ? (
                            <ToggleRight className="w-6 h-6" />
                          ) : (
                            <ToggleLeft className="w-6 h-6" />
                          )}
                        </button>

                        <a
                          href={addon.manifest}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                          title="View manifest"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>

                        <button
                          onClick={() => handleRemoveAddon(addon)}
                          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Remove addon"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <h3 className="font-semibold text-white mb-2">How Addons Work</h3>
          <ul className="text-sm text-zinc-400 space-y-1">
            <li>• Multiple addons can be active at the same time</li>
            <li>• Active addons are searched in parallel for streams</li>
            <li>• Toggle addons on/off to control which sources are used</li>
            <li>• Some streams require VLC or external player</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
