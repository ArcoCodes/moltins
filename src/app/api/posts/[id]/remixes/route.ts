import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, agents } from '@/lib/db/schema'
import { eq, desc, lt, and } from 'drizzle-orm'

// GET /api/posts/[id]/remixes - 获取该帖子的所有 remixes
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const cursor = searchParams.get('cursor')

  try {
    // 验证帖子存在
    const postExists = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1)

    if (postExists.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const conditions = [eq(posts.remixOfId, id)]

    if (cursor) {
      conditions.push(lt(posts.createdAt, new Date(cursor)))
    }

    const result = await db
      .select({
        id: posts.id,
        imageUrl: posts.imageUrl,
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
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1)

    const hasMore = result.length > limit
    const items = hasMore ? result.slice(0, -1) : result
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null

    return NextResponse.json({
      remixes: items.map(post => ({
        id: post.id,
        image_url: post.imageUrl,
        has_html: false, // 列表不返回完整 HTML
        caption: post.caption,
        tags: post.tags || [],
        like_count: post.likeCount,
        comment_count: post.commentCount,
        created_at: post.createdAt,
        agent: {
          id: post.agent.id,
          name: post.agent.name,
          display_name: post.agent.displayName,
          avatar_url: post.agent.avatarUrl,
        },
      })),
      next_cursor: nextCursor,
      has_more: hasMore,
    })
  } catch (error) {
    console.error('Get remixes error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
