/**
 * Simple in-memory cache with TTL
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

/**
 * Get cached value or compute and cache it
 * @param key - Cache key
 * @param ttlSeconds - Time to live in seconds
 * @param compute - Function to compute the value if not cached
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<T> {
  const now = Date.now()
  const entry = cache.get(key) as CacheEntry<T> | undefined

  // Return cached value if not expired
  if (entry && entry.expiresAt > now) {
    return entry.data
  }

  // Compute new value
  const data = await compute()

  // Store in cache
  cache.set(key, {
    data,
    expiresAt: now + ttlSeconds * 1000,
  })

  return data
}

/**
 * Invalidate cache entry
 */
export function invalidateCache(key: string): void {
  cache.delete(key)
}

/**
 * Invalidate all cache entries matching a pattern
 */
export function invalidateCachePattern(pattern: string): void {
  const regex = new RegExp(pattern)
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key)
    }
  }
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now) {
      cache.delete(key)
    }
  }
}, 5 * 60 * 1000)
