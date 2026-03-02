'use client';

import { useEffect } from 'react';

const normalizeBasePath = (value: string | undefined) => {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '';

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  return withoutTrailingSlash.startsWith('/') ? withoutTrailingSlash : `/${withoutTrailingSlash}`;
};

export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

    const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
    const swPath = `${basePath}/sw.js`;
    const scope = basePath ? `${basePath}/` : '/';

    navigator.serviceWorker.register(swPath, { scope }).catch(() => {
      // Keep failure silent in UI; app should continue normally without offline mode.
    });
  }, []);

  return null;
}
