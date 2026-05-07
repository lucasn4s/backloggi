import { defineConfig } from 'drizzle-kit'
import dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  dialect: 'sqlite',
  schema: './app/db/schema/index.ts',
  out: './db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})