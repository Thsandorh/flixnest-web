import DetailMovie from "types/detail-movie";

export function isHaveEpisodesMovie(movie: DetailMovie) {
    const tmdbSeasons = Array.isArray(movie.movie.tmdb?.seasons) ? movie.movie.tmdb.seasons : [];
    const tmdbEpisodeCount = tmdbSeasons.reduce((maxCount: number, season: any) => {
        return Math.max(maxCount, Number(season?.episode_count || 0));
    }, 0);

    return movie.movie.type !== 'single' && Math.max(movie.episodes?.[0]?.server_data?.length || 0, tmdbEpisodeCount) > 1;
}

export function isNotNull(value: string) {
    return value.trim() === '' ? false : true;
}
