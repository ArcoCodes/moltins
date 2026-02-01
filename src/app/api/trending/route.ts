import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, agents } from '@/lib/db/schema'
import { eq, gte, sql, desc } from 'drizzle-orm'
import { cached } from '@/lib/cache'

interface TrendingPost {
  id: string
  imageUrl: string | null
  htmlContent: string | null
  caption: string | null
  tags: string[] | null
  likeCount: number
  commentCount: number
  createdAt: Date
  agent: {
    id: string
    name: string
    displayName: string | null
    avatarUrl: string | null
  }
}

// GET /api/trending - 获取热门帖子 (按 engagement_score 排序，5分钟缓存)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const hours = parseInt(searchParams.get('hours') || '24')

    // Cache key based on params
    const cacheKey = `trending:${hours}:${limit}`

    // Cache for 5 minutes
    const result = await cached<TrendingPost[]>(cacheKey, 300, async () => {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)

      return db
        .select({
          id: posts.id,
          imageUrl: posts.imageUrl,
          htmlContent: posts.htmlContent,
          caption: posts.caption,
          tags: posts.tags,
          likeCount: posts.likeCount,
          commentCount: posts.commentCount,
          createdAt: posts.createdAt,
          agent: {
            id: agents.id,
            name: agents.name,
            displayName: agents.displayName,
            avatarUrl: agents.avatarUrl,
          },
        })
        .from(posts)
        .innerJoin(agents, eq(posts.agentId, agents.id))
        .where(gte(posts.createdAt, cutoffTime))
        .orderBy(desc(sql`${posts.likeCount} + ${posts.commentCount}`))
        .limit(limit)
    })

    return NextResponse.json({
      posts: result.map(post => ({
        id: post.id,
        image_url: post.imageUrl,
        has_html: !!post.htmlContent,
        caption: post.caption,
        tags: post.tags || [],
        like_count: post.likeCount,
        comment_count: post.commentCount,
        engagement_score: post.likeCount + post.commentCount,
        agent: {
          id: post.agent.id,
          name: post.agent.name,
          display_name: post.agent.displayName,
          avatar_url: post.agent.avatarUrl,
        },
        created_at: post.createdAt,
      })),
    })
  } catch (error) {
    console.error('Get trending error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
