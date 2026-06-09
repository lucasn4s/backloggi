import type { BacklogEntry } from '~/db/schema/backlogEntries'

export type BacklogStatus = 'playing' | 'backlog' | 'completed' | 'dropped'

export interface BacklogEntryWithGame extends BacklogEntry {
  game: {
    igdbId: number
    name: string
    coverUrl: string | null
  } | null
}

export function useBacklog() {
  const entries = ref<BacklogEntryWithGame[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBacklog() {
    loading.value = true
    error.value = null
    try {
      entries.value = await $fetch<BacklogEntryWithGame[]>('/api/backlog')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load backlog'
    } finally {
      loading.value = false
    }
  }

  async function addToBacklog(igdbGameId: number, options?: { status?: BacklogStatus; gameName?: string; gameCoverUrl?: string | null }) {
    error.value = null
    try {
      const entry = await $fetch<BacklogEntryWithGame>('/api/backlog', {
        method: 'POST',
        body: {
          igdbGameId,
          status: options?.status,
          gameName: options?.gameName ?? `Game #${igdbGameId}`,
          gameCoverUrl: options?.gameCoverUrl ?? null,
        },
      })
      entries.value.unshift(entry)
      return entry
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to add to backlog'
      throw e
    }
  }

  async function updateEntry(id: number, updates: { status?: BacklogStatus; rating?: number; notes?: string }) {
    error.value = null
    try {
      const updated = await $fetch<BacklogEntryWithGame>(`/api/backlog/${id}`, {
        method: 'PATCH',
        body: updates,
      })
      fetchBacklog();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update entry'
      throw e
    }
  }

  async function removeFromBacklog(id: number) {
    error.value = null
    try {
      await $fetch(`/api/backlog/${id}`, { method: 'DELETE' })
      fetchBacklog();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to remove from backlog'
      throw e
    }
  }

  const grouped = computed(() => {
    const groups: Record<BacklogStatus, BacklogEntryWithGame[]> = {
      playing: [],
      backlog: [],
      completed: [],
      dropped: [],
    }
    for (const entry of entries.value) {
      groups[entry.status].push(entry)
    }
    return groups
  })

  return { entries, loading, error, grouped, fetchBacklog, addToBacklog, updateEntry, removeFromBacklog }
}