import { createError } from 'h3'

interface TwitchTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

interface TwitchTokenCache {
  token: string
  expiresAt: number
  clientId: string
}

let cachedToken: TwitchTokenCache | null = null

export async function getTwitchAppToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && cachedToken.clientId === clientId && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error('Twitch auth failed:', response.status, body)
    throw createError({ statusCode: 502, message: 'External service unavailable' })
  }

  const data: TwitchTokenResponse = await response.json()

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    clientId,
  }

  return cachedToken.token
}