import type { BacklogEntry } from '~/db/schema/backlogEntries'

export type BacklogStatus = 'playing' | 'backlog' | 'completed' | 'dropped'

export function useBacklog() {
  const entries = ref<BacklogEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBacklog() {
    loading.value = true
    error.value = null
    try {
      entries.value = await $fetch<BacklogEntry[]>('/api/backlog')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load backlog'
    } finally {
      loading.value = false
    }
  }

  async function addToBacklog(igdbGameId: number, status?: BacklogStatus) {
    error.value = null
    try {
      const entry = await $fetch<BacklogEntry>('/api/backlog', {
        method: 'POST',
        body: { igdbGameId, status },
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
      const updated = await $fetch<BacklogEntry>(`/api/backlog/${id}`, {
        method: 'PATCH',
        body: updates,
      })
      const index = entries.value.findIndex(e => e.id === id)
      if (index !== -1) {
        entries.value[index] = updated
      }
      return updated
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to update entry'
      throw e
    }
  }

  async function removeFromBacklog(id: number) {
    error.value = null
    try {
      await $fetch(`/api/backlog/${id}`, { method: 'DELETE' })
      entries.value = entries.value.filter(e => e.id !== id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to remove from backlog'
      throw e
    }
  }

  const grouped = computed(() => {
    const groups: Record<BacklogStatus, BacklogEntry[]> = {
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
