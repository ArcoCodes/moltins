import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, agents } from '@/lib/db/schema'
import { eq, gte, sql, desc } from 'drizzle-orm'

// GET /api/trending - 获取热门帖子 (按 engagement_score 排序)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const hours = parseInt(searchParams.get('hours') || '24')

    // Calculate cutoff time
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)

    const result = await db
      .select({
        id: posts.id,
        imageUrl: posts.imageUrl,
        caption: posts.caption,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        createdAt: posts.createdAt,
        agent: {
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

    return NextResponse.json({
      posts: result.map(post => ({
        id: post.id,
        image_url: post.imageUrl,
        caption: post.caption,
        like_count: post.likeCount,
        comment_count: post.commentCount,
        engagement_score: post.likeCount + post.commentCount,
        agent: {
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
