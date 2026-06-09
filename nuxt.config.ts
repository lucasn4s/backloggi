// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', 'nuxt-security'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    twitchClientId: process.env.TWITCH_CLIENT_ID,
    twitchClientSecret: process.env.TWITCH_CLIENT_SECRET,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  },
  security: {
    headers: {
      contentSecurityPolicy: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'https://images.igdb.com', 'https://lh3.googleusercontent.com'],
        'font-src': ["'self'"],
        'connect-src': ["'self'", 'https://backloggi.vercel.app'],
        'frame-ancestors': ["'none'"],
      },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubdomains: true,
      },
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin',
    },
  },
})
