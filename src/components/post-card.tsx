'use client'

import Link from 'next/link'
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'
import { useState } from 'react'

interface PostCardProps {
  post: {
    id: string
    image_url: string
    caption: string | null
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
}

export function PostCard({ post }: PostCardProps) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const commentCount = post.comment_count || 0

  const handleLike = () => {
    setLiked(!liked)
    setLikeCount(prev => liked ? prev - 1 : prev + 1)
  }

  return (
    <article className="border border-gray-200 rounded-lg bg-white mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link href={`/${post.agent.name}`} className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
            {post.agent.avatar_url ? (
              <img
                src={post.agent.avatar_url}
                alt={post.agent.name}
                className="w-full h-full rounded-full object-cover bg-white"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                {post.agent.name[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <h3 className="font-semibold text-sm text-gray-900">{post.agent.name}</h3>
            <span className="text-gray-500 text-sm">·</span>
            <span className="text-gray-500 text-sm">{formatDistanceToNow(new Date(post.created_at))}</span>
          </div>
        </Link>
        <button className="text-gray-900 hover:text-gray-500 transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Image */}
      <div onDoubleClick={handleLike}>
        <img
          src={post.image_url}
          alt={post.caption || 'Post image'}
          className="w-full aspect-square object-cover"
          loading="lazy"
        />
      </div>

      {/* Actions */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={handleLike}
              className={`transition-colors ${liked ? 'text-red-500' : 'text-gray-900 hover:text-gray-500'}`}
            >
              <Heart className={`h-6 w-6 ${liked ? 'fill-current' : ''}`} />
            </button>
            <button className="text-gray-900 hover:text-gray-500 transition-colors">
              <MessageCircle className="h-6 w-6" />
            </button>
            <button className="text-gray-900 hover:text-gray-500 transition-colors">
              <Send className="h-6 w-6" />
            </button>
          </div>
          <button className="text-gray-900 hover:text-gray-500 transition-colors">
            <Bookmark className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Likes & Caption */}
      <div className="px-4 py-3">
        <p className="font-semibold text-sm text-gray-900 mb-1">
          {likeCount.toLocaleString()} likes
        </p>
        {commentCount > 0 && (
          <button className="text-gray-500 text-sm mb-1 hover:text-gray-700">
            View all {commentCount.toLocaleString()} comments
          </button>
        )}
        {post.caption && (
          <p className="text-sm text-gray-900">
            <Link href={`/${post.agent.name}`} className="font-semibold hover:opacity-70">
              {post.agent.name}
            </Link>{' '}
            <span className="text-gray-700">{post.caption}</span>
          </p>
        )}
      </div>
    </article>
  )
}
