'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bookmark, Puzzle, Globe, History, Settings } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store';

const PROMPT_SHOWN_KEY = 'flixnest-registration-prompt-shown';

interface RegistrationPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RegistrationPrompt({ isOpen, onClose }: RegistrationPromptProps) {
  const handleClose = () => {
    localStorage.setItem(PROMPT_SHOWN_KEY, 'true');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 px-4"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="relative p-6 pb-4">
                <button
                  onClick={handleClose}
                  className="absolute right-4 top-4 p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bookmark className="w-6 h-6 text-red-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Get more from Flixnest
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Create a free account to unlock all features
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-xl">
                    <div className="p-2 bg-zinc-700/50 rounded-lg">
                      <Bookmark className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Watchlist</p>
                      <p className="text-xs text-zinc-500">Save movies & shows to watch later</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-xl">
                    <div className="p-2 bg-zinc-700/50 rounded-lg">
                      <History className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Watch History</p>
                      <p className="text-xs text-zinc-500">Resume where you left off, track episodes</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-xl">
                    <div className="p-2 bg-zinc-700/50 rounded-lg">
                      <Puzzle className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Custom Addons</p>
                      <p className="text-xs text-zinc-500">Your streaming sources, synced everywhere</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-xl">
                    <div className="p-2 bg-zinc-700/50 rounded-lg">
                      <Globe className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Subtitle Preferences</p>
                      <p className="text-xs text-zinc-500">Set your default language once</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Link
                    href="/register"
                    onClick={handleClose}
                    className="flex items-center justify-center w-full py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                  >
                    Create Free Account
                  </Link>
                  <button
                    onClick={handleClose}
                    className="w-full py-2.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function useRegistrationPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const showPrompt = () => {
    if (isAuthenticated) return;

    const hasShown = localStorage.getItem(PROMPT_SHOWN_KEY);
    if (!hasShown) {
      setIsOpen(true);
    }
  };

  const closePrompt = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    showPrompt,
    closePrompt,
  };
}
