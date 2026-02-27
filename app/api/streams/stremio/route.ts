import { NextRequest, NextResponse } from 'next/server';

type StremioStream = {
  url?: string;
  ytId?: string;
  externalUrl?: string;
  name?: string;
  title?: string;
  behaviorHints?: Record<string, unknown>;
};

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

const buildStreamEndpoint = (baseUrl: string, type: string, id: string) => {
  const cleanBase = trimTrailingSlash(baseUrl);
  return `${cleanBase}/stream/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`;
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

    const addonBaseUrl = process.env.STREMIO_ADDON_BASE_URL;
    if (!addonBaseUrl) {
      return NextResponse.json(
        { error: 'Missing env: STREMIO_ADDON_BASE_URL' },
        { status: 500 }
      );
    }

    const token = process.env.STREMIO_SUPPORTER_TOKEN;
    const tokenQueryParam = process.env.STREMIO_TOKEN_QUERY_PARAM || 'token';
    const tokenHeaderName = process.env.STREMIO_TOKEN_HEADER_NAME;
    const addonRequestUserAgent =
      process.env.STREMIO_REQUEST_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    const headers: Record<string, string> = {
      accept: 'application/json',
      'user-agent': addonRequestUserAgent,
      'accept-language': 'en-US,en;q=0.9',
      referer: trimTrailingSlash(addonBaseUrl),
    };
    if (token && tokenHeaderName) {
      headers[tokenHeaderName] = token;
    }

    const isSeries = type === 'series';
    const appendSeasonEpisode = (base: string) => {
      if (!isSeries || !season || !episode) return [base];
      return [base, `${base}:${season}:${episode}`];
    };

    const candidatesRaw: string[] = [];
    candidatesRaw.push(...appendSeasonEpisode(id));
    candidatesRaw.push(...appendSeasonEpisode(`tmdb:${id}`));

    if (imdbId) {
      candidatesRaw.push(...appendSeasonEpisode(imdbId));
    }
    if (tmdbId) {
      candidatesRaw.push(...appendSeasonEpisode(`tmdb:${tmdbId}`));
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
    let lastError: { status: number; statusText: string; body: string } | null = null;

    for (const currentId of idCandidates) {
      const endpoint = new URL(buildStreamEndpoint(addonBaseUrl, type, currentId));
      if (token) {
        endpoint.searchParams.set(tokenQueryParam, token);
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

      playable = streams
        .map((stream) => ({
          name: stream.name || stream.title || 'stream',
          url:
            stream.url ||
            stream.externalUrl ||
            (stream.ytId ? `https://www.youtube.com/watch?v=${stream.ytId}` : ''),
          raw: stream,
        }))
        .filter((item) => item.url);

      endpointUsed = endpoint.toString();
      usedId = currentId;
      if (playable.length > 0) break;
    }

    if (!endpointUsed) {
      return NextResponse.json(
        {
          error: 'Stremio addon request failed',
          attemptedIds: idCandidates,
          lastError,
        },
        { status: 502 }
      );
    }

    let firstWorkingUrl = '';
    for (const candidate of playable) {
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
        count: playable.length,
        firstWorkingUrl,
        playable,
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
