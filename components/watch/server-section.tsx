import DetailMovie from 'types/detail-movie';
import { FaCheck } from 'react-icons/fa6';

type StreamCandidate = {
  name: string;
  title: string;
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
  const totalServers = movie.episodes.length + streamCandidates.length;

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

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {movie.episodes.map((item, index) => {
            const isActive = activePlaybackSource === 'native' && serverIndex === index;
            const streamCount = item.server_data.length;
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
          {streamCandidates.map((item, index) => {
            const isActive = activePlaybackSource === 'addon' && activeStreamIndex === index;
            const addonLabel = item.name || `Addon source ${index + 1}`;
            const addonMeta = item.usesManifestProxy ? 'Manifest proxy path' : 'Direct browser stream';
            const addonTitle = item.title.trim();

            return (
              <button
                type="button"
                onClick={() => handleSetAddonSource(index)}
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
                      <div className="text-base font-semibold tracking-tight lg:text-lg">{addonLabel}</div>
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
