const normalizeBasePath = (value?: string | null) => {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '';

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  return withoutTrailingSlash.startsWith('/') ? withoutTrailingSlash : `/${withoutTrailingSlash}`;
};

export const BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

export function withBasePath(pathname: string) {
  if (!pathname) return BASE_PATH || '/';
  if (!pathname.startsWith('/')) return pathname;
  if (!BASE_PATH) return pathname;
  if (pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`)) return pathname;
  if (pathname === '/') return BASE_PATH;

  return `${BASE_PATH}${pathname}`;
}
