import axios from 'axios';

export interface Stream {
  name?: string;
  title?: string;
  url?: string;
  externalUrl?: string;
  headers?: Record<string, string>;
  infoHash?: string;
  fileIdx?: number;
  addonManifest?: string;
  addonName?: string;
  behaviorHints?: {
    notWebReady?: boolean;
    bingeGroup?: string;
    filename?: string;
    videoSize?: number;
    proxyHeaders?: {
      request?: Record<string, string>;
      response?: Record<string, string>;
    };
  };
}

export interface Subtitle {
  id: string;
  url: string;
  lang: string;
}

export interface ManifestResource {
  name: string;
  types: string[];
  idPrefixes?: string[];
}

export interface Manifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  types: string[];
  catalogs?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  resources: ManifestResource[];
  idPrefixes?: string[];
}

export interface MetaPreview {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  imdbRating?: number | string;
  releaseInfo?: string;
  imdb_id?: string;
  imdbId?: string;
}

export interface MetaDetail {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  description?: string;
  genres?: string[];
  imdbRating?: number | string;
  releaseInfo?: string;
  imdb_id?: string;
  imdbId?: string;
}

// Quality sorting weights
const QUALITY_WEIGHTS: Record<string, number> = {
  '4k': 100,
  '2160p': 100,
  'uhd': 95,
  '1080p': 80,
  'fullhd': 80,
  'fhd': 80,
  '720p': 60,
  'hd': 60,
  '480p': 40,
  'sd': 20,
};

// Helper to build proxy URL
function proxyUrl(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

// Extract quality from stream name/title
function getQualityScore(stream: Stream): number {
  const text = `${stream.name || ''} ${stream.title || ''}`.toLowerCase();

  for (const [quality, weight] of Object.entries(QUALITY_WEIGHTS)) {
    if (text.includes(quality)) {
      return weight;
    }
  }

  return 10; // Default low score for unknown quality
}

// Normalize stream: extract URL and headers from various formats
function normalizeStream(stream: Stream): Stream {
  // Use externalUrl if url is not present
  let url = stream.url || stream.externalUrl;

  if (url && url.startsWith('//')) {
    url = `https:${url}`;
  }

  // Extract headers from behaviorHints.proxyHeaders.request if not in headers directly
  let headers = stream.headers;
  if (!headers && stream.behaviorHints?.proxyHeaders?.request) {
    headers = stream.behaviorHints.proxyHeaders.request;
  }

  return {
    ...stream,
    url,
    headers,
  };
}

// Filter and sort streams
function processStreams(streams: Stream[]): Stream[] {
  return streams
    // Normalize streams first (extract URL and headers from various locations)
    .map(normalizeStream)
    // Keep both HTTP(S) and magnet links
    .filter((stream) => {
      if (!stream.url) return false;
      // Accept both regular streams and torrents
      return stream.url.startsWith('https://') ||
             stream.url.startsWith('http://') ||
             stream.url.startsWith('magnet:');
    })
    // Sort by quality (4K > 1080p > 720p > etc.)
    .sort((a, b) => getQualityScore(b) - getQualityScore(a));
}

// Fetch manifest from addon URL
export async function getManifest(manifestUrl: string): Promise<Manifest | null> {
  try {
    const response = await axios.get<Manifest>(proxyUrl(manifestUrl), {
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching manifest:', error);
    return null;
  }
}

// Get streams from addon
export async function getStreams(
  addonManifestUrl: string,
  type: 'movie' | 'series' | 'tv' | 'channel',
  imdbId: string,
  season?: number,
  episode?: number
): Promise<Stream[]> {
  try {
    // Build the stream endpoint URL
    const baseUrl = addonManifestUrl.replace('/manifest.json', '');
    // Don't convert 'tv'/'channel' to 'series' - TV channels need their original type
    const stremioType = type === 'series' ? 'series' : type === 'channel' ? 'channel' : type === 'tv' ? 'tv' : 'movie';

    let streamUrl: string;
    if (stremioType === 'series' && season !== undefined && episode !== undefined) {
      streamUrl = `${baseUrl}/stream/${stremioType}/${imdbId}:${season}:${episode}.json`;
    } else {
      streamUrl = `${baseUrl}/stream/${stremioType}/${imdbId}.json`;
    }

    console.log('[STREMIO] Fetching streams from:', streamUrl);
    console.log('[STREMIO] Stream type:', stremioType, '| Content ID:', imdbId);

    const response = await axios.get<{ streams: Stream[] }>(proxyUrl(streamUrl), {
      timeout: 15000,
    });

    console.log('[STREMIO] Raw response:', JSON.stringify(response.data, null, 2));
    console.log('[STREMIO] Total streams received:', response.data?.streams?.length || 0);

    if (!response.data?.streams) {
      console.warn('[STREMIO] No streams in response');
      return [];
    }

    // Log each stream before filtering
    response.data.streams.forEach((stream, idx) => {
      console.log(`[STREMIO] Stream ${idx}:`, {
        name: stream.name,
        title: stream.title,
        url: stream.url?.substring(0, 80),
        externalUrl: stream.externalUrl?.substring(0, 80),
        hasInfoHash: !!stream.infoHash,
        urlProtocol: stream.url?.split(':')[0],
        hasHeaders: !!stream.headers,
        hasBehaviorHints: !!stream.behaviorHints
      });
    });

    const processed = processStreams(response.data.streams);
    console.log('[STREMIO] Streams after filtering:', processed.length);

    if (processed.length === 0 && response.data.streams.length > 0) {
      console.warn('[STREMIO] All streams were filtered out! Original streams:',
        response.data.streams.map(s => ({
          url: s.url,
          externalUrl: s.externalUrl,
          infoHash: s.infoHash
        }))
      );
    }

    return processed;
  } catch (error) {
    console.error('[STREMIO] Error fetching streams:', error);
    if (axios.isAxiosError(error)) {
      console.error('[STREMIO] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message
      });
    }
    return [];
  }
}

// Get subtitles from active subtitle addons
export async function getSubtitles(
  imdbId: string,
  type: 'movie' | 'series' | 'tv' | 'channel',
  season?: number,
  episode?: number,
  addonManifests: string[] = []
): Promise<Subtitle[]> {
  try {
    if (addonManifests.length === 0) {
      return [];
    }

    const stremioType = type === 'movie' ? 'movie' : type;
    const requests = addonManifests.map(async (manifestUrl) => {
      const baseUrl = manifestUrl.replace('/manifest.json', '');

      let subtitleUrl: string;
      if (stremioType === 'series' && season !== undefined && episode !== undefined) {
        subtitleUrl = `${baseUrl}/subtitles/${stremioType}/${imdbId}:${season}:${episode}.json`;
      } else {
        subtitleUrl = `${baseUrl}/subtitles/${stremioType}/${imdbId}.json`;
      }

      const response = await axios.get<{ subtitles: Subtitle[] }>(proxyUrl(subtitleUrl), {
        timeout: 10000,
      });

      return response.data?.subtitles ?? [];
    });

    const results = await Promise.allSettled(requests);
    const allSubtitles: Subtitle[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        allSubtitles.push(...result.value);
      }
    }

    if (allSubtitles.length === 0) {
      return [];
    }

    // Deduplicate by URL, keep all languages/providers
    const seen = new Set<string>();
    return allSubtitles.filter((sub) => {
      if (!sub.url) return false;
      if (seen.has(sub.url)) return false;
      seen.add(sub.url);
      return true;
    });
  } catch (error) {
    console.error('Error fetching subtitles:', error);
    return [];
  }
}

export function extractImdbId(id: string): string | null {
  const match = id.match(/tt\d{5,}/);
  return match ? match[0] : null;
}

export async function getCatalogItems(
  addonManifestUrl: string,
  type: string,
  catalogId: string,
  extra: Record<string, string | number> = {}
): Promise<MetaPreview[]> {
  try {
    const baseUrl = addonManifestUrl.replace('/manifest.json', '');
    const query = new URLSearchParams();
    Object.entries(extra).forEach(([key, value]) => {
      query.set(key, String(value));
    });
    const suffix = query.toString();
    const catalogUrl = suffix
      ? `${baseUrl}/catalog/${type}/${catalogId}.json?${suffix}`
      : `${baseUrl}/catalog/${type}/${catalogId}.json`;

    const response = await axios.get<{ metas: MetaPreview[] }>(proxyUrl(catalogUrl), {
      timeout: 15000,
    });

    return response.data?.metas ?? [];
  } catch (error) {
    console.error('Error fetching catalog items:', error);
    return [];
  }
}

export async function getMeta(
  addonManifestUrl: string,
  type: string,
  id: string
): Promise<MetaDetail | null> {
  try {
    const baseUrl = addonManifestUrl.replace('/manifest.json', '');
    const metaUrl = `${baseUrl}/meta/${type}/${encodeURIComponent(id)}.json`;

    const response = await axios.get<{ meta: MetaDetail }>(proxyUrl(metaUrl), {
      timeout: 10000,
    });

    return response.data?.meta ?? null;
  } catch (error) {
    console.error('Error fetching meta:', error);
    return null;
  }
}

// Get external IDs from TMDB (including IMDB)
export async function getExternalIds(
  tmdbId: string,
  type: 'movie' | 'tv'
): Promise<{ imdb_id?: string; tvdb_id?: number } | null> {
  const TMDB_API_KEY = 'ffe7ef8916c61835264d2df68276ddc2';

  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/${type}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`,
      { timeout: 10000 }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching external IDs:', error);
    return null;
  }
}

// Get TMDB ID from IMDB ID
export async function getTmdbFromImdb(
  imdbId: string,
  type: 'movie' | 'tv'
): Promise<string | null> {
  const TMDB_API_KEY = 'ffe7ef8916c61835264d2df68276ddc2';

  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`,
      { timeout: 10000 }
    );

    const results =
      type === 'movie' ? response.data.movie_results : response.data.tv_results;

    return results?.[0]?.id?.toString() || null;
  } catch (error) {
    console.error('Error fetching TMDB ID:', error);
    return null;
  }
}

// Check if stream is a torrent/magnet link (not debrid-converted)
export function isTorrentStream(stream: Stream): boolean {
  // Only magnet links are actual torrents
  // Streams with infoHash but HTTP URL are debrid-converted streams (playable directly)
  return !!(stream.url?.startsWith('magnet:'));
}

// Parse stream title for quality info display
export function parseStreamInfo(stream: Stream): {
  quality: string;
  source: string;
  size?: string;
  isTorrent: boolean;
} {
  const text = `${stream.name || ''} ${stream.title || ''}`;

  let quality = 'SD';
  if (text.toLowerCase().includes('4k') || text.toLowerCase().includes('2160p')) {
    quality = '4K';
  } else if (text.toLowerCase().includes('1080p')) {
    quality = '1080p';
  } else if (text.toLowerCase().includes('720p')) {
    quality = '720p';
  } else if (text.toLowerCase().includes('480p')) {
    quality = '480p';
  }

  const source = stream.name || 'Unknown';

  // Try to extract size
  const sizeMatch = text.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i);
  const size = sizeMatch ? sizeMatch[1] : undefined;

  return { quality, source, size, isTorrent: isTorrentStream(stream) };
}

// Get streams from multiple addons
export async function getStreamsFromMultipleAddons(
  addonManifests: string[],
  type: 'movie' | 'series' | 'tv' | 'channel',
  imdbId: string,
  season?: number,
  episode?: number
): Promise<Stream[]> {
  const streamPromises = addonManifests.map((manifest) =>
    getStreams(manifest, type, imdbId, season, episode)
  );

  const results = await Promise.allSettled(streamPromises);

  const allStreams: Stream[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allStreams.push(...result.value);
    }
  }

  // Dedupe by URL and re-sort
  const seen = new Set<string>();
  const uniqueStreams = allStreams.filter((stream) => {
    if (!stream.url || seen.has(stream.url)) return false;
    seen.add(stream.url);
    return true;
  });

  return uniqueStreams.sort((a, b) => getQualityScore(b) - getQualityScore(a));
}
