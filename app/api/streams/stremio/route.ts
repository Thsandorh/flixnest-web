import { NextRequest, NextResponse } from 'next/server';

type StremioStream = {
  url?: string;
  ytId?: string;
  externalUrl?: string;
  name?: string;
  title?: string;
  behaviorHints?: Record<string, unknown>;
};

type AddonConfig = {
  baseUrl: string;
  displayName: string;
  usesPrimaryAuth: boolean;
};

const DEFAULT_NUVIO_ADDON_BASE_URL =
  'https://nuviostreams.hayd.uk/providers=vidzee,vidsrc,vixsrc/manifest.json';

const isLikelyPlayable = async (url: string, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Range: 'bytes=0-1024',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    return res.ok || res.status === 206;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizeAddonBaseUrl = (rawBaseUrl: string) => {
  const parsed = new URL(rawBaseUrl);

  parsed.search = '';
  parsed.hash = '';

  const cleanedPath = parsed.pathname
    .replace(/\/manifest\.json$/i, '')
    .replace(/\/stream$/i, '')
    .replace(/\/+$/, '');

  parsed.pathname = cleanedPath || '/';
  return trimTrailingSlash(parsed.toString());
};

const buildStreamEndpoint = (baseUrl: string, type: string, id: string) => {
  const cleanBase = trimTrailingSlash(baseUrl);
  return `${cleanBase}/stream/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`;
};

const buildAddonConfigs = (primaryAddonBaseUrl: string | undefined) => {
  const rawExtraBaseUrls = String(process.env.STREMIO_ADDON_BASE_URLS || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  const rawCandidates = [
    primaryAddonBaseUrl?.trim() || '',
    ...rawExtraBaseUrls,
    DEFAULT_NUVIO_ADDON_BASE_URL,
  ].filter(Boolean);

  const seen = new Set<string>();
  const primaryNormalized = primaryAddonBaseUrl ? normalizeAddonBaseUrl(primaryAddonBaseUrl) : '';

  return rawCandidates
    .map((rawBaseUrl, index) => {
      const normalizedBaseUrl = normalizeAddonBaseUrl(rawBaseUrl);
      if (seen.has(normalizedBaseUrl)) return null;
      seen.add(normalizedBaseUrl);

      return {
        baseUrl: normalizedBaseUrl,
        displayName: index === 0 && primaryNormalized === normalizedBaseUrl ? 'Flix Streams' : 'Nuvio',
        usesPrimaryAuth: Boolean(primaryNormalized && normalizedBaseUrl === primaryNormalized),
      } satisfies AddonConfig;
    })
    .filter((item): item is AddonConfig => item !== null);
};

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get('type');
    const id = request.nextUrl.searchParams.get('id');
    const season = request.nextUrl.searchParams.get('season');
    const episode = request.nextUrl.searchParams.get('episode');
    const imdbId = request.nextUrl.searchParams.get('imdbId');
    const tmdbId = request.nextUrl.searchParams.get('tmdbId');
    const kitsuId = request.nextUrl.searchParams.get('kitsuId');
    const aniwaysId = request.nextUrl.searchParams.get('aniwaysId');

    if (!type || !id) {
      return NextResponse.json(
        { error: "Missing query params. Required: 'type' and 'id'." },
        { status: 400 }
      );
    }

    const primaryAddonBaseUrl = process.env.STREMIO_ADDON_BASE_URL;
    const addonConfigs = buildAddonConfigs(primaryAddonBaseUrl);
    if (addonConfigs.length === 0) {
      return NextResponse.json(
        { error: 'Missing addon configuration' },
        { status: 500 }
      );
    }

    const token = process.env.STREMIO_SUPPORTER_TOKEN;
    const tokenQueryParam = process.env.STREMIO_TOKEN_QUERY_PARAM || 'token';
    const tokenHeaderName = process.env.STREMIO_TOKEN_HEADER_NAME;
    const addonRequestUserAgent =
      process.env.STREMIO_REQUEST_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    const isSeries = type === 'series';
    const appendSeasonEpisode = (base: string) => {
      if (!isSeries || !season || !episode) return [base];
      return [base, `${base}:${season}:${episode}`];
    };

    const candidatesRaw: string[] = [];
    candidatesRaw.push(...appendSeasonEpisode(id));
    candidatesRaw.push(...appendSeasonEpisode(`tmdb:${id}`));
    candidatesRaw.push(...appendSeasonEpisode(`tmdb:${type}:${id}`));
    if (type === 'series') {
      candidatesRaw.push(...appendSeasonEpisode(`tmdb:tv:${id}`));
    }

    if (imdbId) {
      candidatesRaw.push(...appendSeasonEpisode(imdbId));
    }
    if (tmdbId) {
      candidatesRaw.push(...appendSeasonEpisode(`tmdb:${tmdbId}`));
      candidatesRaw.push(...appendSeasonEpisode(`tmdb:${type}:${tmdbId}`));
      if (type === 'series') {
        candidatesRaw.push(...appendSeasonEpisode(`tmdb:tv:${tmdbId}`));
      }
    }
    if (kitsuId) {
      if (isSeries && episode) {
        // kitsu:<id>:<episode> and kitsu:<id>:<season>:<episode> are both supported.
        candidatesRaw.push(`kitsu:${kitsuId}:${episode}`);
        if (season) {
          candidatesRaw.push(`kitsu:${kitsuId}:${season}:${episode}`);
        }
      } else {
        candidatesRaw.push(`kitsu:${kitsuId}`);
      }
    }
    if (aniwaysId) {
      if (isSeries && episode) {
        // aniways:<id>:<episode> and aniways:<id>:<season>:<episode> are both supported.
        candidatesRaw.push(`aniways:${aniwaysId}:${episode}`);
        if (season) {
          candidatesRaw.push(`aniways:${aniwaysId}:${season}:${episode}`);
        }
      } else {
        candidatesRaw.push(`aniways:${aniwaysId}`);
      }
    }

    const idCandidates = Array.from(new Set(candidatesRaw.filter(Boolean)));

    let endpointUsed = '';
    let usedId = '';
    let playable: Array<{ name: string; url: string; raw: StremioStream }> = [];
    const attemptedEndpoints: string[] = [];
    let lastError: { status: number; statusText: string; body: string } | null = null;

    for (const addon of addonConfigs) {
      const addonOrigin = new URL(addon.baseUrl).origin;
      const baseHeaders: Record<string, string> = {
        accept: 'application/json,text/plain,*/*',
        'user-agent': addonRequestUserAgent,
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'identity',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        referer: `${addonOrigin}/`,
        origin: addonOrigin,
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
      };

      for (const currentId of idCandidates) {
        const endpoint = new URL(buildStreamEndpoint(addon.baseUrl, type, currentId));
        attemptedEndpoints.push(endpoint.toString());

        if (addon.usesPrimaryAuth && token) {
          endpoint.searchParams.set(tokenQueryParam, token);
        }

        const headers: Record<string, string> = { ...baseHeaders };
        if (addon.usesPrimaryAuth && token && tokenHeaderName) {
          headers[tokenHeaderName] = token;
        }

        const response = await fetch(endpoint.toString(), {
          method: 'GET',
          headers,
          cache: 'no-store',
          redirect: 'follow',
        });

        if (!response.ok) {
          lastError = {
            status: response.status,
            statusText: response.statusText,
            body: await response.text(),
          };
          continue;
        }

        const payload = (await response.json()) as { streams?: StremioStream[] };
        const streams = Array.isArray(payload?.streams) ? payload.streams : [];
        const resolvedStreams = streams
          .map((stream) => ({
            name: stream.name ? `${addon.displayName} · ${stream.name}` : addon.displayName,
            url:
              stream.url ||
              stream.externalUrl ||
              (stream.ytId ? `https://www.youtube.com/watch?v=${stream.ytId}` : ''),
            raw: stream,
          }))
          .filter((item) => item.url);

        if (resolvedStreams.length === 0) {
          continue;
        }

        if (!endpointUsed) {
          endpointUsed = endpoint.toString();
          usedId = currentId;
        }

        playable.push(...resolvedStreams);
        break;
      }
    }

    const dedupedPlayable = playable.filter((item, index, allItems) => {
      return allItems.findIndex((candidate) => candidate.url === item.url) === index;
    });

    if (!endpointUsed) {
      return NextResponse.json(
        {
          error: 'Stremio addon request failed',
          attemptedIds: idCandidates,
          attemptedEndpoints,
          lastError,
        },
        { status: 502 }
      );
    }

    let firstWorkingUrl = '';
    for (const candidate of dedupedPlayable) {
      // Find the first stream URL that responds successfully.
      if (await isLikelyPlayable(candidate.url)) {
        firstWorkingUrl = candidate.url;
        break;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        requested: { type, id },
        usedId,
        endpoint: endpointUsed,
        endpoints: attemptedEndpoints,
        count: dedupedPlayable.length,
        firstWorkingUrl,
        playable: dedupedPlayable,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Unexpected error',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
