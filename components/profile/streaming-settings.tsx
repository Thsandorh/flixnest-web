'use client';

import { useState, useEffect } from 'react';
import { IoGlobeOutline, IoCheckmark, IoKeyOutline } from 'react-icons/io5';
import { toast } from 'react-toastify';
import LoadingSpinerBtn from '../loading/loading-spiner-btn';

export default function StreamingSettings() {
  const [addonUrl, setAddonUrl] = useState('');
  const [supporterToken, setSupporterToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load existing settings if available in localStorage
    const savedUrl = localStorage.getItem('flix-streams-addon-url');
    const savedToken = localStorage.getItem('flix-streams-token');
    if (savedUrl) setAddonUrl(savedUrl);
    if (savedToken) setSupporterToken(savedToken);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    localStorage.setItem('flix-streams-addon-url', addonUrl);
    localStorage.setItem('flix-streams-token', supporterToken);

    toast.success('Streaming Addon configuration saved successfully.');
    setIsSaving(false);
  };

  return (
    <div>
      <div className="flex items-center space-x-3 mb-6">
        <IoGlobeOutline className="text-custome-red" size={24} />
        <h2 className="text-xl font-semibold text-white">Streaming Addons</h2>
      </div>

      <div className="mb-6 space-y-2">
        <p className="text-gray-400">
          Configure your personal Flix Streams Addon URL and Supporter Token to enhance your streaming experience across the platform.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
          Unlock 4K, Zero Ads, Ultra-fast servers
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Addon URL */}
        <div className="space-y-2">
          <label htmlFor="addonUrl" className="block text-sm font-medium text-gray-300">
            Flix Streams Addon URL
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IoGlobeOutline className="text-gray-500" />
            </div>
            <input
              type="url"
              id="addonUrl"
              value={addonUrl}
              onChange={(e) => setAddonUrl(e.target.value)}
              placeholder="https://your-addon-url.com/manifest.json"
              className="w-full pl-10 p-3 border border-gray-600 bg-black/50 text-white focus:outline-none focus:border-custome-red focus:ring-1 focus:ring-custome-red rounded-lg transition-colors"
            />
          </div>
          <p className="text-xs text-gray-500">
            Enter the base URL or manifest.json URL for your custom Stremio addon.
          </p>
        </div>

        {/* Supporter Token */}
        <div className="space-y-2">
          <label htmlFor="supporterToken" className="block text-sm font-medium text-gray-300">
            Supporter Token
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IoKeyOutline className="text-gray-500" />
            </div>
            <input
              type="password"
              id="supporterToken"
              value={supporterToken}
              onChange={(e) => setSupporterToken(e.target.value)}
              placeholder="Enter your premium access token"
              className="w-full pl-10 p-3 border border-gray-600 bg-black/50 text-white focus:outline-none focus:border-custome-red focus:ring-1 focus:ring-custome-red rounded-lg transition-colors"
            />
          </div>
          <p className="text-xs text-gray-500">
            Used to authenticate premium streams. Get this from your provider dashboard.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-gray-700/50">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-3 bg-custome-red text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <LoadingSpinerBtn />
            ) : (
              <>
                <IoCheckmark size={18} />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-gray-800/30 border border-gray-700 rounded-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(225,29,72,0.05),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <h4 className="text-white font-medium mb-2 relative z-10">Why use custom addons?</h4>
        <p className="text-gray-400 text-sm relative z-10">
          By configuring your own stream addons, you override the default servers with your private sources.
          This means significantly better performance, more 4K options, and a seamless ad-free experience.
          Settings are saved securely in your browser.
        </p>
      </div>
    </div>
  );
}
