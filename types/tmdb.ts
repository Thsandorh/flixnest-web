export interface TmdbSeason {
    season: number
    name: string
    episode_count: number
}

export default interface Tmdb{
    type: string
    id: string
    season: number
    seasons?: TmdbSeason[]
    vote_average: number
    vote_count: number
}
