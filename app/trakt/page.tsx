'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTraktStore } from '@/store';

type DeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  created_at: number;
};

export default function TraktPage() {
  const { accessToken, refreshToken, expiresAt, username, setTokens, clearTokens } = useTraktStore();
  const [deviceCode, setDeviceCode] = useState<DeviceCodeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const isConnected = Boolean(accessToken);

  const expiresAtDate = useMemo(() => {
    if (!expiresAt) return null;
    return new Date(expiresAt);
  }, [expiresAt]);

  const readJson = async <T,>(response: Response): Promise<T | null> => {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  };

  const startDeviceFlow = async () => {
    setError(null);
    setDeviceCode(null);

    try {
      const response = await fetch('/api/trakt/device', { method: 'POST' });
      const data = await readJson<DeviceCodeResponse>(response);
      if (!response.ok) {
        throw new Error((data as any)?.error || 'Failed to request Trakt code');
      }
      if (!data) {
        throw new Error('Empty response from Trakt device endpoint.');
      }
      setDeviceCode(data);
      setIsPolling(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Trakt flow');
    }
  };

  const refreshTokenFlow = async () => {
    if (!refreshToken) return;
    setError(null);

    try {
      const response = await fetch('/api/trakt/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await readJson<TokenResponse>(response);
      if (!response.ok) {
        throw new Error((data as any)?.error || 'Failed to refresh token');
      }
      if (!data) {
        throw new Error('Empty response from Trakt refresh endpoint.');
      }
      const nextExpiresAt = (data.created_at + data.expires_in) * 1000;
      setTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: nextExpiresAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh token');
    }
  };

  useEffect(() => {
    if (!deviceCode || !isPolling) return;

    let isActive = true;
    const intervalMs = deviceCode.interval * 1000;

    const poll = async () => {
      try {
        const response = await fetch('/api/trakt/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceCode: deviceCode.device_code }),
        });
        const data = await readJson<TokenResponse>(response);

        if (response.ok && data?.access_token) {
          const nextExpiresAt = (data.created_at + data.expires_in) * 1000;
          setTokens({
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: nextExpiresAt,
          });
          setIsPolling(false);
          setDeviceCode(null);
          return;
        }

        const errorCode = (data as any)?.error;
        if (errorCode === 'authorization_pending') {
          return;
        }

        if (errorCode === 'expired_token') {
          setError('Trakt code expired. Please try again.');
          setIsPolling(false);
          return;
        }

        if (errorCode && isActive) {
          setError(String(errorCode));
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Failed to poll Trakt token');
        }
      }
    };

    const intervalId = window.setInterval(poll, intervalMs);
    poll();

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [deviceCode, isPolling, setTokens]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 md:px-12 py-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Trakt 연결</h1>
          <p className="text-zinc-400">
            Párosítsd a Trakt fiókodat, hogy a watchlist és a nézési előzmények automatikusan szinkronizálódjanak.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-zinc-400">Állapot</p>
              <p className="text-lg font-semibold">
                {isConnected ? 'Csatlakoztatva' : 'Nincs csatlakoztatva'}
              </p>
              {username && (
                <p className="text-sm text-zinc-400">Trakt felhasználó: {username}</p>
              )}
              {expiresAtDate && (
                <p className="text-sm text-zinc-400">
                  Token lejár: {expiresAtDate.toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {isConnected ? (
                <>
                  <button
                    onClick={refreshTokenFlow}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
                  >
                    Frissítés
                  </button>
                  <button
                    onClick={clearTokens}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition"
                  >
                    Leválasztás
                  </button>
                </>
              ) : (
                <button
                  onClick={startDeviceFlow}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition"
                >
                  Trakt összekötés
                </button>
              )}
            </div>
          </div>

          {deviceCode && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <p className="text-sm text-zinc-400">Írd be ezt a kódot:</p>
              <div className="text-3xl font-bold tracking-widest">{deviceCode.user_code}</div>
              <p className="text-sm text-zinc-400">
                Nyisd meg:{' '}
                <Link className="text-red-400 underline" href={deviceCode.verification_url} target="_blank">
                  {deviceCode.verification_url}
                </Link>
              </p>
              <p className="text-xs text-zinc-500">
                A kód {Math.round(deviceCode.expires_in / 60)} percig érvényes. Várjuk a jóváhagyást…
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>
    </main>
  );
}
