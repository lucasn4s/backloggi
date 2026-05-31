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
  releaseDates?: { y: number; date: number }[]
  rating?: number
  summary?: string
  platforms?: { id: number; name: string }[]
  totalRating?: number
}

export async function searchGames(query: string, clientId: string, clientSecret: string, limit = 20, offset = 0): Promise<IgdbGame[]> {
  const igdbQuery = `search "${query}"; fields id, name, cover.url, genres.name, releaseDates.date, rating, summary, platforms.name, totalRating; limit ${limit}; offset ${offset};`
  return igdbFetch<IgdbGame[]>('games', igdbQuery, clientId, clientSecret)
}

export async function getGameById(id: number, clientId: string, clientSecret: string): Promise<IgdbGame> {
  const igdbQuery = `where id = ${id}; fields id, name, cover.url, genres.name, releaseDates.date, rating, summary, platforms.name, totalRating;`
  const results = await igdbFetch<IgdbGame[]>('games', igdbQuery, clientId, clientSecret)
  if (results.length === 0) {
    throw new Error('Game not found')
  }
  return results[0]
}

export async function getTrendingGames(clientId: string, clientSecret: string, limit = 12): Promise<IgdbGame[]> {
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
  const now = Math.floor(Date.now() / 1000)
  const igdbQuery = `where releaseDates.date > ${thirtyDaysAgo} & releaseDates.date < ${now}; sort totalRating desc; limit ${limit}; fields id, name, cover.url, genres.name, releaseDates.date, rating, summary, platforms.name, totalRating;`
  return igdbFetch<IgdbGame[]>('games', igdbQuery, clientId, clientSecret)
}