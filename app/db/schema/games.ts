import { pgTable, integer, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { backlogEntries } from './backlogEntries'

export const games = pgTable('games', {
  igdbId: integer('igdb_id').primaryKey(),
  name: text('name').notNull(),
  coverUrl: text('cover_url'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const gamesRelations = relations(games, ({ many }) => ({
  backlogEntries: many(backlogEntries),
}))

export type Game = typeof games.$inferSelect
export type NewGame = typeof games.$inferInsert