/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting service
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (resets on server restart)
const store = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSeconds: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
}

/**
 * Check rate limit for a given key
 * @param key - Unique identifier (e.g., IP address, API key hash, or "action:identifier")
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000

  let entry = store.get(key)

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    }
    store.set(key, entry)
    return {
      success: true,
      remaining: config.limit - 1,
      resetAt: entry.resetAt,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Increment count
  entry.count++
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Get client IP from request
 * Handles common proxy headers
 */
export function getClientIp(request: Request): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Take the first IP (client IP)
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Fallback (won't work in serverless, but useful for local dev)
  return 'unknown'
}

// Preset configurations for common use cases
export const RATE_LIMITS = {
  // General API requests: 100 per minute
  general: { limit: 100, windowSeconds: 60 },

  // Create post: 1 per 10 minutes (platform limit)
  createPost: { limit: 1, windowSeconds: 600 },

  // Registration: 3 per hour per IP
  register: { limit: 3, windowSeconds: 3600 },

  // Like/unlike: 60 per minute
  like: { limit: 60, windowSeconds: 60 },

  // Comment: 10 per minute
  comment: { limit: 10, windowSeconds: 60 },

  // Follow/unfollow: 30 per minute
  follow: { limit: 30, windowSeconds: 60 },
}
