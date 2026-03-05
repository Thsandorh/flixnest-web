import DetailMovie from 'types/detail-movie';
import { FaCheck, FaCrown, FaBolt } from 'react-icons/fa6';
import Link from 'next/link';

type StreamCandidate = {
  name: string;
  title: string;
  provider: string;
  usesManifestProxy: boolean;
};

type Props = {
  movie: DetailMovie;
  serverIndex: number;
  streamCandidates: StreamCandidate[];
  activeStreamIndex: number;
  activePlaybackSource: 'native' | 'addon';
  handleSetServerIndex: (index: number) => void;
  handleSetAddonSource: (index: number) => void;
};

export default function ServerSection({
  movie,
  serverIndex,
  streamCandidates,
  activeStreamIndex,
  activePlaybackSource,
  handleSetServerIndex,
  handleSetAddonSource,
}: Props) {
  const episodeServers = Array.isArray(movie.episodes) ? movie.episodes : [];
  const safeEpisodeServers = episodeServers.filter((entry) => entry && typeof entry === 'object');

  // Filter out duplicate or low quality links. Keep up to 2 Nuvio links as free tier examples.
  // We must map the original index so the parent component gets the correct index for selection.
  const filteredCandidates = streamCandidates
    .map((candidate, index) => ({ candidate, originalIndex: index }))
    .filter(({ candidate }, index, self) => {
      if (candidate.provider === 'Flix Streams') return true;
      if (candidate.provider === 'Nuvio') {
        const nuvioBeforeMe = self.slice(0, index).filter((c) => c.candidate.provider === 'Nuvio').length;
        return nuvioBeforeMe < 2;
      }
      return false;
    });

  const totalServers = safeEpisodeServers.length + filteredCandidates.length;

  return (
    <div className="container-wrapper-movie px-4 lg:px-0">
      <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(135deg,_rgba(24,24,27,0.96),_rgba(10,10,14,0.98))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.32em] text-zinc-500">Playback Sources</p>
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-white lg:text-xl">
                Choose the server route
              </h3>
              <p className="text-sm text-zinc-400">
                Switch instantly if one source is slower or less stable.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
            {totalServers} {totalServers === 1 ? 'server' : 'servers'} available
          </div>
        </div>

        {/* Promotional Banner */}
        <div className="mt-6 mb-5 group relative overflow-hidden rounded-2xl border border-rose-500/30 bg-[linear-gradient(135deg,_rgba(225,29,72,0.1),_rgba(159,18,57,0.2))] p-5 shadow-[0_0_30px_rgba(225,29,72,0.15)] transition-all duration-300 hover:border-rose-500/50 hover:shadow-[0_0_40px_rgba(225,29,72,0.25)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.1),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-rose-200">
                <FaCrown size={12} className="text-yellow-400" />
                Flix Streams Premium
              </div>
              <h4 className="text-xl font-bold tracking-tight text-white md:text-2xl">
                Tired of buffering or missing links?
              </h4>
              <p className="max-w-xl text-sm leading-relaxed text-rose-100/80 md:text-base">
                Upgrade to the <span className="font-semibold text-rose-200">Paid Tier</span> for instant access to exclusive 4K servers, zero ads, and ultra-fast playback. Say goodbye to dead links forever.
              </p>
            </div>
            <Link
              href="/profile?tab=streaming"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#e11d48,#be123c)] px-6 py-3 font-semibold text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:shadow-rose-500/50"
            >
              <FaBolt size={16} className="text-yellow-300" />
              Get Premium Access
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {safeEpisodeServers.map((item, index) => {
            const isActive = activePlaybackSource === 'native' && serverIndex === index;
            const serverData = Array.isArray(item.server_data) ? item.server_data : [];
            const streamCount = serverData.length;
            const slotLabel =
              streamCount === 1 ? 'Direct stream ready' : `${streamCount} episode entries available`;

            return (
              <button
                type="button"
                onClick={() => handleSetServerIndex(index)}
                className={`group relative overflow-hidden rounded-[1.35rem] border p-4 text-left transition-all duration-200 ${
                  isActive
                    ? 'border-sky-300/40 bg-[linear-gradient(135deg,_rgba(56,189,248,0.16),_rgba(255,255,255,0.06))] text-white shadow-[0_20px_50px_rgba(14,165,233,0.14)]'
                    : 'border-white/10 bg-white/[0.03] text-zinc-200 hover:border-white/20 hover:bg-white/[0.06]'
                }`}
                key={index}
              >
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.05),transparent)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] uppercase tracking-[0.24em] text-zinc-400">
                      <span
                        className={`h-2 w-2 rounded-full ${isActive ? 'bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.9)]' : 'bg-zinc-500'}`}
                      />
                      Server {String(index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <div className="text-base font-semibold tracking-tight lg:text-lg">{item.server_name}</div>
                      <div className="mt-1 text-sm text-zinc-400">{slotLabel}</div>
                    </div>
                  </div>
                  <div
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                      isActive
                        ? 'border-sky-300/40 bg-sky-300/15 text-sky-100'
                        : 'border-white/10 bg-white/5 text-zinc-500'
                    }`}
                  >
                    <FaCheck size={12} />
                  </div>
                </div>

                <div className="relative mt-4 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    {streamCount === 1 ? 'Single source' : `${streamCount} episodes synced`}
                  </span>
                  <span className={isActive ? 'text-sky-100' : 'text-zinc-300'}>
                    {isActive ? 'Active now' : 'Switch source'}
                  </span>
                </div>
              </button>
            );
          })}
          {filteredCandidates.map(({ candidate: item, originalIndex }, index) => {
            const isActive = activePlaybackSource === 'addon' && activeStreamIndex === originalIndex;
            const addonLabel = item.name || `Addon source ${index + 1}`;
            const addonMeta = item.usesManifestProxy ? 'Manifest proxy path' : 'Direct browser stream';
            const addonTitle = item.title.trim();
            const providerLabel = item.provider || 'Addon';
            const providerClasses =
              providerLabel === 'Nuvio'
                ? 'border-emerald-300/20 bg-emerald-300/12 text-emerald-100'
                : 'border-sky-300/20 bg-sky-300/12 text-sky-100';

            return (
              <button
                type="button"
                onClick={() => handleSetAddonSource(originalIndex)}
                className={`group relative overflow-hidden rounded-[1.35rem] border p-4 text-left transition-all duration-200 ${
                  isActive
                    ? 'border-emerald-300/40 bg-[linear-gradient(135deg,_rgba(16,185,129,0.16),_rgba(255,255,255,0.06))] text-white shadow-[0_20px_50px_rgba(16,185,129,0.14)]'
                    : 'border-white/10 bg-white/[0.03] text-zinc-200 hover:border-white/20 hover:bg-white/[0.06]'
                }`}
                key={`${addonLabel}-${index}`}
              >
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.05),transparent)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] uppercase tracking-[0.24em] text-zinc-400">
                      <span
                        className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]' : 'bg-zinc-500'}`}
                      />
                      Source {String(index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base font-semibold tracking-tight lg:text-lg">{addonLabel}</div>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${providerClasses}`}
                        >
                          {providerLabel}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-zinc-400">
                        {addonTitle || addonMeta}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                      isActive
                        ? 'border-emerald-300/40 bg-emerald-300/15 text-emerald-100'
                        : 'border-white/10 bg-white/5 text-zinc-500'
                    }`}
                  >
                    <FaCheck size={12} />
                  </div>
                </div>

                <div className="relative mt-4 flex items-center justify-between gap-3 text-xs">
                  <span className="text-zinc-400">{addonMeta}</span>
                  <span className={isActive ? 'text-emerald-100' : 'text-zinc-300'}>
                    {isActive ? 'Active now' : 'Switch source'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
