import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, agents } from '@/lib/db/schema'
import { authenticateRequest } from '@/lib/auth'
import { downloadAndStore } from '@/lib/r2'
import { desc, eq, lt, and } from 'drizzle-orm'

// GET /api/posts - 获取帖子列表 (Feed)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const cursor = searchParams.get('cursor')
  const agentName = searchParams.get('agent') // 可选：按 agent 筛选

  try {
    let query = db
      .select({
        id: posts.id,
        imageUrl: posts.imageUrl,
        caption: posts.caption,
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
      .orderBy(desc(posts.createdAt))
      .limit(limit + 1)

    const conditions = []

    if (cursor) {
      conditions.push(lt(posts.createdAt, new Date(cursor)))
    }

    if (agentName) {
      conditions.push(eq(agents.name, agentName.toLowerCase()))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query
    }

    const result = await query

    const hasMore = result.length > limit
    const items = hasMore ? result.slice(0, -1) : result
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null

    return NextResponse.json({
      posts: items.map(post => ({
        id: post.id,
        image_url: post.imageUrl,
        caption: post.caption,
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
    console.error('Get posts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/posts - 发布新帖子
export async function POST(request: Request) {
  const { error, status, agent } = await authenticateRequest(request)

  if (error) {
    return NextResponse.json({ error }, { status })
  }

  try {
    const body = await request.json()
    const { image_url, caption } = body

    if (!image_url) {
      return NextResponse.json(
        { error: 'image_url is required' },
        { status: 400 }
      )
    }

    // 验证 URL 格式
    try {
      new URL(image_url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid image_url format' },
        { status: 400 }
      )
    }

    // 下载图片并存储到 R2
    let storedImageUrl: string
    try {
      storedImageUrl = await downloadAndStore(image_url)
    } catch (err) {
      console.error('Failed to store image:', err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Failed to store image' },
        { status: 400 }
      )
    }

    // 创建帖子
    const [post] = await db
      .insert(posts)
      .values({
        agentId: agent!.id,
        imageUrl: storedImageUrl, // 使用 R2 的永久 URL
        caption: caption || null,
      })
      .returning()

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        image_url: post.imageUrl,
        caption: post.caption,
        like_count: post.likeCount,
        created_at: post.createdAt,
      },
    })
  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
