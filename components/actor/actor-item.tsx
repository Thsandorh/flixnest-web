import Link from 'next/link';
import Actor from 'types/actor';
import ActorImgDefault from '../../public/default-actor-img.jpg';
import Image from 'next/image';
import { tmdbImageUrl } from 'utils/tmdb-image-url';

const buildTmdbPersonUrl = (actorId: number) => `https://www.themoviedb.org/person/${actorId}`;

export default function ActorItem({ actor }: { actor: Actor | string }) {
  if (typeof actor === 'string') {
    return (
      <div className="w-full text-center space-y-2">
        <Link href={`/search?name=${encodeURIComponent(actor)}`} className="block">
          <div className="w-full aspect-square rounded-full overflow-hidden relative">
            <Image
              src={ActorImgDefault}
              alt={actor}
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          <div className="mt-3 hover:text-custome-red transition-colors">{actor}</div>
        </Link>
        <Link
          href={`/search?name=${encodeURIComponent(actor)}`}
          className="text-xs text-gray-400 hover:text-custome-red transition-colors"
        >
          Movies
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full text-center space-y-2">
      <Link
        href={buildTmdbPersonUrl(actor.id)}
        target="_blank"
        rel="noreferrer"
        className="block"
        title="Open actor on TMDB"
      >
        <div className="w-full aspect-square rounded-full overflow-hidden relative">
          <Image
            src={actor.profile_path ? tmdbImageUrl(actor.profile_path, 'w300') : ActorImgDefault}
            alt={actor.name}
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="mt-3 hover:text-custome-red transition-colors">{actor.name}</div>
      </Link>
      <div className="text-sm text-gray-400">{actor.character}</div>
      <div className="flex items-center justify-center gap-2 text-xs">
        <Link
          href={buildTmdbPersonUrl(actor.id)}
          target="_blank"
          rel="noreferrer"
          className="text-gray-400 hover:text-custome-red transition-colors"
        >
          TMDB
        </Link>
        <span className="text-gray-600">•</span>
        <Link
          href={`/search?name=${encodeURIComponent(actor.name)}`}
          className="text-gray-400 hover:text-custome-red transition-colors"
        >
          Movies
        </Link>
      </div>
    </div>
  );
}
