'use client';

import { useState } from 'react';
import { IoLanguage, IoCheckmark } from 'react-icons/io5';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
];

export default function LanguageSettings() {
  const [selectedLanguage, setSelectedLanguage] = useState('vi');
  const [isSaving, setIsSaving] = useState(false);

  const handleLanguageChange = async (languageCode: string) => {
    setIsSaving(true);
    setSelectedLanguage(languageCode);

    // Simulate API call to save language preference
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Here you would typically save to localStorage or send to your backend
    localStorage.setItem('preferred-language', languageCode);

    setIsSaving(false);
  };

  return (
    <div>
      <div className="flex items-center space-x-3 mb-6">
        <IoLanguage className="text-custome-red" size={24} />
        <h2 className="text-xl font-semibold text-white">Language settings</h2>
      </div>

      <div className="mb-6">
        <p className="text-gray-400">
          Choose the display language for the app interface. Changes are applied immediately.
        </p>
      </div>

      {/* Language Selection */}
      <div className="space-y-3">
        {languages.map((language) => (
          <div
            key={language.code}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedLanguage === language.code
                ? 'border-custome-red bg-red-900/20'
                : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/30'
            }`}
            onClick={() => handleLanguageChange(language.code)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-2xl">{language.flag}</span>
                <div>
                  <h3 className="text-white font-medium">{language.nativeName}</h3>
                  <p className="text-gray-400 text-sm">{language.name}</p>
                </div>
              </div>

              {selectedLanguage === language.code && (
                <div className="flex items-center space-x-2">
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-custome-red border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <IoCheckmark className="text-custome-red" size={20} />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Current Language Info */}
      <div className="mt-8 p-4 bg-gray-800/30 border border-gray-600 rounded-lg">
        <h3 className="text-white font-medium mb-2">Current language</h3>
        <div className="flex items-center space-x-3">
          <span className="text-2xl">
            {languages.find((lang) => lang.code === selectedLanguage)?.flag}
          </span>
          <div>
            <p className="text-white">
              {languages.find((lang) => lang.code === selectedLanguage)?.nativeName}
            </p>
            <p className="text-gray-400 text-sm">
              {languages.find((lang) => lang.code === selectedLanguage)?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Additional Settings */}
      <div className="mt-8 space-y-4">
        <h3 className="text-white font-medium">Additional settings</h3>

        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-custome-red bg-black border-gray-600 rounded focus:ring-custome-red focus:ring-2"
              defaultChecked
            />
            <span className="text-gray-300">Auto-detect language from browser</span>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-custome-red bg-black border-gray-600 rounded focus:ring-custome-red focus:ring-2"
            />
            <span className="text-gray-300">Show language names in native language</span>
          </label>
        </div>
      </div>

      {/* Language Info */}
      <div className="mt-8 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
        <h4 className="text-blue-400 font-medium mb-2">💡 Information</h4>
        <p className="text-gray-400 text-sm">
          Changing language affects the entire app interface. Some content may remain in the
          original language if it has not been translated yet.
        </p>
      </div>
    </div>
  );
}
