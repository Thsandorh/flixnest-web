'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Trash2, Clock, Film, Tv, AlertCircle } from 'lucide-react';

import { MediaCard } from '@/components/ui/media-card';
import { useWatchlistStore, useHistoryStore } from '@/store';

type TabType = 'watchlist' | 'history';

export default function MyListPage() {
  const [activeTab, setActiveTab] = useState<TabType>('watchlist');

  const { watchlist, clearWatchlist } = useWatchlistStore();
  const { history, clearHistory } = useHistoryStore();

  const handleClearAll = () => {
    if (activeTab === 'watchlist') {
      if (window.confirm('Are you sure you want to clear your watchlist?')) {
        clearWatchlist();
      }
    } else {
      if (window.confirm('Are you sure you want to clear your watch history?')) {
        clearHistory();
      }
    }
  };

  const currentItems = activeTab === 'watchlist' ? watchlist : history;

  return (
    <main className="min-h-screen bg-zinc-950 pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/20 rounded-xl">
              <Bookmark className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">My List</h1>
              <p className="text-zinc-400">
                {activeTab === 'watchlist'
                  ? 'Movies and shows you want to watch'
                  : 'Your watch history'}
              </p>
            </div>
          </div>

          {currentItems.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'watchlist'
                ? 'bg-white text-black'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            Watchlist ({watchlist.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-black'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            History ({history.length})
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {currentItems.length > 0 ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
            >
              {activeTab === 'watchlist'
                ? watchlist.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <MediaCard
                        id={item.id}
                        title={item.title}
                        poster={item.poster}
                        backdrop={item.backdrop}
                        type={item.type}
                      />
                    </motion.div>
                  ))
                : history.map((item, index) => (
                    <motion.div
                      key={`${item.id}-${item.lastWatchedAt}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <MediaCard
                        id={item.id}
                        title={item.title}
                        poster={item.poster}
                        backdrop={item.backdrop}
                        type={item.type}
                        historyItem={item}
                        variant="default"
                      />
                    </motion.div>
                  ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="p-6 bg-zinc-900 rounded-full mb-6">
                {activeTab === 'watchlist' ? (
                  <Bookmark className="w-12 h-12 text-zinc-600" />
                ) : (
                  <Clock className="w-12 h-12 text-zinc-600" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {activeTab === 'watchlist'
                  ? 'Your watchlist is empty'
                  : 'No watch history yet'}
              </h3>
              <p className="text-zinc-400 text-center max-w-md">
                {activeTab === 'watchlist'
                  ? 'Add movies and shows to your watchlist by clicking the + button on any title.'
                  : 'Start watching movies and shows to build your history.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        {currentItems.length > 0 && (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Film className="w-4 h-4" />
                <span className="text-sm">Movies</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {currentItems.filter((i) => i.type === 'movie').length}
              </p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Tv className="w-4 h-4" />
                <span className="text-sm">Series</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {currentItems.filter((i) => i.type === 'tv').length}
              </p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Bookmark className="w-4 h-4" />
                <span className="text-sm">Total Items</span>
              </div>
              <p className="text-2xl font-bold text-white">{currentItems.length}</p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Last Updated</span>
              </div>
              <p className="text-lg font-medium text-white">
                {currentItems.length > 0
                  ? new Date(
                      activeTab === 'watchlist'
                        ? watchlist[0]?.addedAt
                        : history[0]?.lastWatchedAt
                    ).toLocaleDateString()
                  : '-'}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
