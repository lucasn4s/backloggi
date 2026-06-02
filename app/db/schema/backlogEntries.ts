import { pgTable, text, integer, timestamp, serial, pgEnum } from 'drizzle-orm/pg-core'
import { users } from './users'

export const statusEnum = pgEnum('status', ['playing', 'backlog', 'completed', 'dropped'])

export const backlogEntries = pgTable('backlog_entries', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  igdbGameId: integer('igdb_game_id').notNull(),
  status: statusEnum('status').default('backlog').notNull(),
  rating: integer('rating'),
  notes: text('notes'),
  addedAt: timestamp('added_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type BacklogEntry = typeof backlogEntries.$inferSelect
export type NewBacklogEntry = typeof backlogEntries.$inferInsert
