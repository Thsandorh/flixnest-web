import axios from 'axios';

export interface Stream {
  name?: string;
  title?: string;
  url?: string;
  headers?: Record<string, string>;
  infoHash?: string;
  fileIdx?: number;
  behaviorHints?: {
    notWebReady?: boolean;
    bingeGroup?: string;
    filename?: string;
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

// Filter and sort streams
function processStreams(streams: Stream[]): Stream[] {
  return streams
    // Filter out magnet links, keep only HTTPS
    .filter((stream) => {
      if (!stream.url) return false;
      if (stream.url.startsWith('magnet:')) return false;
      if (stream.infoHash) return false;
      return stream.url.startsWith('https://') || stream.url.startsWith('http://');
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
  type: 'movie' | 'series' | 'tv',
  imdbId: string,
  season?: number,
  episode?: number
): Promise<Stream[]> {
  try {
    // Build the stream endpoint URL
    const baseUrl = addonManifestUrl.replace('/manifest.json', '');
    const stremioType = type === 'tv' || type === 'series' ? 'series' : 'movie';

    let streamUrl: string;
    if (stremioType === 'series' && season !== undefined && episode !== undefined) {
      streamUrl = `${baseUrl}/stream/${stremioType}/${imdbId}:${season}:${episode}.json`;
    } else {
      streamUrl = `${baseUrl}/stream/${stremioType}/${imdbId}.json`;
    }

    console.log('[STREMIO] Fetching streams from:', streamUrl);

    const response = await axios.get<{ streams: Stream[] }>(proxyUrl(streamUrl), {
      timeout: 15000,
    });

    console.log('[STREMIO] Raw response:', response.data);
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
        url: stream.url?.substring(0, 50) + '...',
        hasInfoHash: !!stream.infoHash,
        urlProtocol: stream.url?.split(':')[0]
      });
    });

    const processed = processStreams(response.data.streams);
    console.log('[STREMIO] Streams after filtering:', processed.length);

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

// Get subtitles from OpenSubtitles addon
export async function getSubtitles(
  imdbId: string,
  type: 'movie' | 'series' | 'tv',
  season?: number,
  episode?: number
): Promise<Subtitle[]> {
  try {
    const stremioType = type === 'tv' || type === 'series' ? 'series' : 'movie';
    const openSubsUrl = 'https://opensubtitles-v3.strem.io';

    let subtitleUrl: string;
    if (stremioType === 'series' && season !== undefined && episode !== undefined) {
      subtitleUrl = `${openSubsUrl}/subtitles/${stremioType}/${imdbId}:${season}:${episode}.json`;
    } else {
      subtitleUrl = `${openSubsUrl}/subtitles/${stremioType}/${imdbId}.json`;
    }

    const response = await axios.get<{ subtitles: Subtitle[] }>(proxyUrl(subtitleUrl), {
      timeout: 10000,
    });

    if (!response.data?.subtitles) {
      return [];
    }

    // Return unique subtitles by language
    const seen = new Set<string>();
    return response.data.subtitles.filter((sub) => {
      if (seen.has(sub.lang)) return false;
      seen.add(sub.lang);
      return true;
    });
  } catch (error) {
    console.error('Error fetching subtitles:', error);
    return [];
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

// Parse stream title for quality info display
export function parseStreamInfo(stream: Stream): {
  quality: string;
  source: string;
  size?: string;
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

  return { quality, source, size };
}

// Get streams from multiple addons
export async function getStreamsFromMultipleAddons(
  addonManifests: string[],
  type: 'movie' | 'series' | 'tv',
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
