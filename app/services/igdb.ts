import { getTwitchAppToken } from './twitch'

const IGDB_BASE = 'https://api.igdb.com/v4'

async function igdbFetch<T>(endpoint: string, query: string, clientId: string, clientSecret: string): Promise<T> {
  const token = await getTwitchAppToken(clientId, clientSecret)

  const response = await fetch(`${IGDB_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body: query,
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`IGDB API error (${response.status}): ${body}`)
  }

  return response.json() as Promise<T>
}

export interface IgdbGame {
  id: number
  name: string
  cover?: { id: number; url: string }
  genres?: { id: number; name: string }[]
  release_dates?: { y: number }[]
  rating?: number
  summary?: string
  platforms?: { id: number; name: string }[]
  total_rating?: number
}

export async function searchGames(query: string, clientId: string, clientSecret: string, limit = 20, offset = 0): Promise<IgdbGame[]> {
  const igdbQuery = `search "${query}"; fields id, name, cover.url, genres.name, release_dates.y, rating, summary, platforms.name, total_rating; limit ${limit}; offset ${offset};`
  return igdbFetch<IgdbGame[]>('games', igdbQuery, clientId, clientSecret)
}

export async function getGameById(id: number, clientId: string, clientSecret: string): Promise<IgdbGame> {
  const igdbQuery = `where id = ${id}; fields id, name, cover.url, genres.name, release_dates.y, rating, summary, platforms.name, total_rating;`
  const results = await igdbFetch<IgdbGame[]>('games', igdbQuery, clientId, clientSecret)
  if (results.length === 0) {
    throw new Error('Game not found')
  }
  return results[0]
}

export async function getTrendingGames(clientId: string, clientSecret: string, limit = 12): Promise<IgdbGame[]> {
  const igdbQuery = `where release_dates.y > 2024 & total_rating > 70; sort total_rating desc; limit ${limit}; fields id, name, cover.url, genres.name, release_dates.y, rating, summary, platforms.name, total_rating;`
  return igdbFetch<IgdbGame[]>('games', igdbQuery, clientId, clientSecret)
}