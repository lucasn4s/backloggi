import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('IGDB Service', () => {
  beforeEach(() => {
    vi.resetModules()
    global.fetch = vi.fn()
  })

  describe('getTwitchAppToken', () => {
    it('should fetch and return a token', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test_token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      } as Response)

      const { getTwitchAppToken } = await import('~/services/twitch')
      const token = await getTwitchAppToken('test_client_id', 'test_client_secret')

      expect(token).toBe('test_token')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://id.twitch.tv/oauth2/token',
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should throw on failed auth', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      } as Response)

      const { getTwitchAppToken } = await import('~/services/twitch')

      await expect(getTwitchAppToken('bad_id', 'bad_secret')).rejects.toThrow('Twitch auth failed (400)')
    })

    it('should cache token and reuse it', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'cached_token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      } as Response)

      const { getTwitchAppToken } = await import('~/services/twitch')
      const token1 = await getTwitchAppToken('client_id', 'client_secret')
      const token2 = await getTwitchAppToken('client_id', 'client_secret')

      expect(token1).toBe('cached_token')
      expect(token2).toBe('cached_token')
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('searchGames', () => {
    it('should call IGDB search endpoint with correct query', async () => {
      const tokenFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'test_token', expires_in: 3600, token_type: 'bearer' }),
      })
      const igdbFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 1, name: 'Zelda' }]),
      })

      vi.mocked(global.fetch)
        .mockImplementation((url: string) => {
          if (url.includes('twitch')) return tokenFetch()
          return igdbFetch()
        })

      const { searchGames } = await import('~/services/igdb')
      const results = await searchGames('Zelda', 'client_id', 'client_secret')

      expect(results).toEqual([{ id: 1, name: 'Zelda' }])
    })
  })

  describe('getTrendingGames', () => {
    it('should return trending games', async () => {
      const tokenFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ access_token: 'test_token', expires_in: 3600, token_type: 'bearer' }),
      })
      const igdbFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ id: 2, name: 'Elden Ring' }]),
      })

      vi.mocked(global.fetch)
        .mockImplementation((url: string) => {
          if (url.includes('twitch')) return tokenFetch()
          return igdbFetch()
        })

      const { getTrendingGames } = await import('~/services/igdb')
      const results = await getTrendingGames('client_id', 'client_secret')

      expect(results).toEqual([{ id: 2, name: 'Elden Ring' }])
    })
  })
})