'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Plus, Trash2 } from 'lucide-react';
import { useSettingsStore } from '@/store';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hu', name: 'Hungarian / Magyar' },
  { code: 'es', name: 'Spanish / Español' },
  { code: 'fr', name: 'French / Français' },
  { code: 'de', name: 'German / Deutsch' },
  { code: 'it', name: 'Italian / Italiano' },
  { code: 'pt', name: 'Portuguese / Português' },
  { code: 'ru', name: 'Russian / Русский' },
  { code: 'ja', name: 'Japanese / 日本語' },
  { code: 'ko', name: 'Korean / 한국어' },
  { code: 'zh', name: 'Chinese / 中文' },
  { code: 'ar', name: 'Arabic / العربية' },
  { code: 'tr', name: 'Turkish / Türkçe' },
  { code: 'nl', name: 'Dutch / Nederlands' },
  { code: 'pl', name: 'Polish / Polski' },
  { code: 'sv', name: 'Swedish / Svenska' },
  { code: 'no', name: 'Norwegian / Norsk' },
  { code: 'da', name: 'Danish / Dansk' },
  { code: 'fi', name: 'Finnish / Suomi' },
  { code: 'cs', name: 'Czech / Čeština' },
  { code: 'ro', name: 'Romanian / Română' },
  { code: 'el', name: 'Greek / Ελληνικά' },
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    autoSelectSubtitles,
    preferredSubtitleLanguages,
    setAutoSelectSubtitles,
    setPreferredSubtitleLanguages,
    addPreferredLanguage,
    removePreferredLanguage,
  } = useSettingsStore();

  const [selectedLanguageToAdd, setSelectedLanguageToAdd] = useState('');

  const handleAddLanguage = () => {
    if (selectedLanguageToAdd && !preferredSubtitleLanguages.includes(selectedLanguageToAdd)) {
      addPreferredLanguage(selectedLanguageToAdd);
      setSelectedLanguageToAdd('');
    }
  };

  const handleRemoveLanguage = (language: string) => {
    if (preferredSubtitleLanguages.length > 1) {
      removePreferredLanguage(language);
    }
  };

  const moveLanguage = (index: number, direction: 'up' | 'down') => {
    const newLanguages = [...preferredSubtitleLanguages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLanguages.length) return;

    [newLanguages[index], newLanguages[targetIndex]] = [newLanguages[targetIndex], newLanguages[index]];
    setPreferredSubtitleLanguages(newLanguages);
  };

  const getLanguageName = (code: string) => {
    const lang = COMMON_LANGUAGES.find((l) => l.code === code);
    return lang ? lang.name : code.toUpperCase();
  };

  const availableLanguages = COMMON_LANGUAGES.filter(
    (lang) => !preferredSubtitleLanguages.includes(lang.code)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl glass rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                <h2 className="text-2xl font-bold text-white">Settings</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {/* Trakt */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white">Trakt</h3>
                  <p className="text-sm text-zinc-400 mt-1 mb-3">
                    Trakt szinkronizáció a watchlisthez és nézési előzményekhez.
                  </p>
                  <a
                    href="/trakt"
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                  >
                    Trakt beállítások megnyitása
                  </a>
                </div>

                {/* Auto-select Subtitles */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Auto-select Subtitles</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Automatically select subtitles based on your preferred languages
                      </p>
                    </div>
                    <button
                      onClick={() => setAutoSelectSubtitles(!autoSelectSubtitles)}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        autoSelectSubtitles ? 'bg-red-600' : 'bg-zinc-700'
                      }`}
                    >
                      <motion.div
                        animate={{ x: autoSelectSubtitles ? 28 : 4 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute top-1 w-5 h-5 bg-white rounded-full"
                      />
                    </button>
                  </div>
                </div>

                {/* Preferred Languages */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Preferred Subtitle Languages
                  </h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    The first available subtitle in this order will be auto-selected
                  </p>

                  {/* Current Languages */}
                  <div className="space-y-2 mb-4">
                    {preferredSubtitleLanguages.map((lang, index) => (
                      <div
                        key={lang}
                        className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveLanguage(index, 'up')}
                              disabled={index === 0}
                              className="text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <button
                              onClick={() => moveLanguage(index, 'down')}
                              disabled={index === preferredSubtitleLanguages.length - 1}
                              className="text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                          <span className="text-white font-medium">{getLanguageName(lang)}</span>
                          <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs rounded">
                            Priority {index + 1}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveLanguage(lang)}
                          disabled={preferredSubtitleLanguages.length === 1}
                          className="p-2 text-zinc-500 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Language */}
                  {availableLanguages.length > 0 && (
                    <div className="flex gap-2">
                      <select
                        value={selectedLanguageToAdd}
                        onChange={(e) => setSelectedLanguageToAdd(e.target.value)}
                        className="flex-1 px-4 py-2 bg-zinc-900 text-white rounded-lg border border-zinc-700 focus:border-red-600 focus:outline-none"
                      >
                        <option value="">Select a language to add...</option>
                        {availableLanguages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAddLanguage}
                        disabled={!selectedLanguageToAdd}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
