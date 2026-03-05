'use client';

import { useState, useEffect } from 'react';
import { IoGlobeOutline, IoCheckmark } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import LoadingSpinerBtn from '../loading/loading-spiner-btn';

export default function StreamingSettings() {
  const [addonUrl, setAddonUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const user = useSelector((state: any) => state.auth.user);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`/api/users/me/flix-streams?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.addonUrl) {
            setAddonUrl(data.addonUrl);
          }
        }
      } catch (error) {
        console.error('Failed to load streaming settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('You must be logged in to save settings.');
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch('/api/users/me/flix-streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, addonUrl }),
      });

      if (res.ok) {
        toast.success('Streaming Addon configuration saved securely.');
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Failed to save settings.');
      }
    } catch (error) {
      toast.error('An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center space-x-3 mb-6">
        <IoGlobeOutline className="text-custome-red" size={24} />
        <h2 className="text-xl font-semibold text-white">Streaming Addons</h2>
      </div>

      <div className="mb-6 space-y-2">
        <p className="text-gray-400">
          Configure your personal Flix Streams Addon URL to enhance your streaming experience.
          The Supporter token is automatically included within the generated manifest URL.
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
          Unlock 4K, Zero Ads, Ultra-fast servers
        </div>
        <div className="mt-2 text-sm text-sky-400">
          <Link href="https://flixnest.app/flix-stream" target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
            <IoGlobeOutline size={16} />
            Learn more and get your token at flixnest.app/flix-stream
          </Link>
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
          Settings are saved securely and encrypted in our database.
        </p>
      </div>
    </div>
  );
}
