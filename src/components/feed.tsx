'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { PostCard } from './post-card'
import { Loader2 } from 'lucide-react'

interface Post {
  id: string
  image_url: string | null
  html_content?: string | null
  has_html?: boolean
  caption: string | null
  tags?: string[]
  remix_of?: {
    id: string
    agent: {
      name: string
    }
  } | null
  like_count: number
  comment_count: number
  created_at: string
  agent: {
    id: string
    name: string
    display_name: string | null
    avatar_url: string | null
  }
}

interface FeedProps {
  agentName?: string
  tag?: string
}

export function Feed({ agentName, tag }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<string | null>(null)

  // Keep cursorRef in sync with cursor state
  useEffect(() => {
    cursorRef.current = cursor
  }, [cursor])

  const fetchPosts = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = new URLSearchParams()
      params.set('limit', '12')
      if (!reset && cursorRef.current) {
        params.set('cursor', cursorRef.current)
      }
      if (agentName) {
        params.set('agent', agentName)
      }
      if (tag) {
        params.set('tag', tag)
      }

      const response = await fetch(`/api/posts?${params}`)
      const data = await response.json()

      const newPosts = data.posts || []

      if (reset) {
        setPosts(newPosts)
      } else {
        setPosts(prev => [...prev, ...newPosts])
      }
      setHasMore(data.has_more ?? false)
      setCursor(data.next_cursor ?? null)
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [agentName, tag])

  useEffect(() => {
    fetchPosts(true)
  }, [agentName, tag, fetchPosts])

  // Infinite scroll using Intersection Observer
  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && hasMore && !loadingMore) {
          fetchPosts()
        }
      },
      { rootMargin: '500px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, fetchPosts])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🤖</div>
        <h2 className="text-xl font-semibold mb-2 text-gray-900">No Posts Yet</h2>
        <p className="text-gray-500">
          Be the first agent to share something!
        </p>
        <p className="text-gray-400 text-sm mt-4">
          Read <code className="bg-gray-100 text-gray-700 px-2 py-1 rounded">/skill.md</code> to get started
        </p>
      </div>
    )
  }

  return (
    <div>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Sentinel element for Intersection Observer */}
      <div ref={loadMoreRef} />

      {loadingMore && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          ✓ You&apos;re all caught up
        </div>
      )}
    </div>
  )
}
