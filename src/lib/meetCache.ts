// Module-level in-memory cache — persists across tab switches within the same session.
// TTL ensures data doesn't go stale; invalidate() forces a fresh fetch after mutations.

interface CacheEntry<T> { data: T; expiresAt: number }

const cache = new Map<string, CacheEntry<unknown>>()

export function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { cache.delete(key); return null }
  return entry.data as T
}

export function cacheSet<T>(key: string, data: T, ttlMs = 60_000) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function cacheInvalidate(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}

// Cache keys used by Meet Day
export const meetKeys = {
  competitions:  () => 'meet:competitions',
  attempts:      (athleteId: string) => `meet:attempts:${athleteId}`,
  profile:       (athleteId: string) => `meet:profile:${athleteId}`,
  schedule:      (athleteId: string, compId: string) => `meet:schedule:${athleteId}:${compId}`,
  competitors:   (athleteId: string, compId: string) => `meet:competitors:${athleteId}:${compId}`,
}
