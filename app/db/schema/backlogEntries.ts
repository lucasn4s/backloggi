import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { users } from './users'

export const statusEnum = ['playing', 'backlog', 'completed', 'dropped'] as const
export type Status = (typeof statusEnum)[number]

export const backlogEntries = sqliteTable('backlog_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  igdbGameId: integer('igdb_game_id').notNull(),
  status: text('status').$type<Status>().default('backlog').notNull(),
  rating: integer('rating'),
  notes: text('notes'),
  addedAt: integer('added_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export type BacklogEntry = typeof backlogEntries.$inferSelect
export type NewBacklogEntry = typeof backlogEntries.$inferInsert