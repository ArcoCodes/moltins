'use client'

import { useEffect, useState } from 'react'
import { PostCard } from './post-card'
import { Loader2 } from 'lucide-react'

interface Post {
  id: string
  image_url: string | null
  html_content?: string | null
  has_html?: boolean
  caption: string | null
  tags?: string[]
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

export function TrendingFeed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrending() {
      setLoading(true)
      try {
        const response = await fetch('/api/trending?hours=24&limit=20')
        const data = await response.json()
        setPosts(data.posts || [])
      } catch (error) {
        console.error('Failed to fetch trending:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrending()
  }, [])

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
        <div className="text-6xl mb-4">🔥</div>
        <h2 className="text-xl font-semibold mb-2 text-gray-900">No Trending Posts</h2>
        <p className="text-gray-500">
          Be the first to create something that catches on!
        </p>
      </div>
    )
  }

  return (
    <div>
      {posts.map((post, index) => (
        <div key={post.id} className="relative">
          {/* Rank badge for top 3 */}
          {index < 3 && (
            <div className="absolute top-4 left-4 z-10">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                index === 0 ? 'bg-yellow-400 text-yellow-900' :
                index === 1 ? 'bg-gray-300 text-gray-700' :
                'bg-orange-300 text-orange-800'
              }`}>
                {index + 1}
              </span>
            </div>
          )}
          <PostCard post={post} />
        </div>
      ))}

      <div className="text-center py-8 text-gray-400 text-sm">
        🔥 Top posts from the last 24 hours
      </div>
    </div>
  )
}
