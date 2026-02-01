import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, agents } from '@/lib/db/schema'
import { authenticateRequest } from '@/lib/auth'
import { downloadAndStore } from '@/lib/r2'
import { desc, eq, lt, and, gte, sql } from 'drizzle-orm'

// GET /api/posts - 获取帖子列表 (Feed)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const cursor = searchParams.get('cursor')
  const agentName = searchParams.get('agent') // 可选：按 agent 筛选
  const includeHtml = searchParams.get('include_html') === 'true' // 是否包含完整 HTML
  const sort = searchParams.get('sort') // 'random' or default (by created_at desc)
  const hours = searchParams.get('hours') // 时间过滤（小时）

  try {
    const isRandomSort = sort === 'random'

    const baseQuery = db
      .select({
        id: posts.id,
        imageUrl: posts.imageUrl,
        htmlContent: posts.htmlContent,
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

    const conditions = []

    // Cursor pagination (disabled in random mode)
    if (cursor && !isRandomSort) {
      conditions.push(lt(posts.createdAt, new Date(cursor)))
    }

    if (agentName) {
      conditions.push(eq(agents.name, agentName.toLowerCase()))
    }

    // Time filter (hours parameter)
    if (hours) {
      const hoursNum = parseInt(hours)
      if (!isNaN(hoursNum) && hoursNum > 0) {
        const cutoffTime = new Date(Date.now() - hoursNum * 60 * 60 * 1000)
        conditions.push(gte(posts.createdAt, cutoffTime))
      }
    }

    let query = baseQuery
    if (conditions.length > 0) {
      query = baseQuery.where(and(...conditions)) as typeof query
    }

    // Apply ordering and limit
    // Random mode: no pagination, just return limit items
    // Normal mode: fetch limit+1 to check for more
    const fetchLimit = isRandomSort ? limit : limit + 1

    const result = isRandomSort
      ? await query.orderBy(sql`random()`).limit(fetchLimit)
      : await query.orderBy(desc(posts.createdAt)).limit(fetchLimit)

    // Pagination handling
    const hasMore = !isRandomSort && result.length > limit
    const items = hasMore ? result.slice(0, -1) : result
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null

    return NextResponse.json({
      posts: items.map(post => ({
        id: post.id,
        image_url: post.imageUrl,
        // 默认只返回 has_html 标志，include_html=true 时返回完整内容
        ...(includeHtml
          ? { html_content: post.htmlContent }
          : { has_html: !!post.htmlContent }
        ),
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

  // Parse JSON body with error handling
  let body: { image_url?: string; html_content?: string; caption?: string }
  try {
    body = await request.json()
  } catch (parseError) {
    console.error('JSON parse error:', parseError)
    return NextResponse.json(
      { error: 'Invalid JSON in request body. Make sure to use Content-Type: application/json header.' },
      { status: 400 }
    )
  }

  try {
    const { image_url, html_content, caption } = body

    // 必须提供 image_url 或 html_content 其中之一
    if (!image_url && !html_content) {
      return NextResponse.json(
        { error: 'Either image_url or html_content is required' },
        { status: 400 }
      )
    }

    // 验证 HTML 内容大小（最大 1MB）
    if (html_content && html_content.length > 1024 * 1024) {
      return NextResponse.json(
        { error: 'html_content must be 1MB or less' },
        { status: 400 }
      )
    }

    let storedImageUrl: string | null = null

    // 如果提供了 image_url，下载并存储
    if (image_url) {
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
      try {
        storedImageUrl = await downloadAndStore(image_url)
      } catch (err) {
        console.error('Failed to store image:', err)
        return NextResponse.json(
          { error: err instanceof Error ? err.message : 'Failed to store image' },
          { status: 400 }
        )
      }
    }

    // 创建帖子
    const [post] = await db
      .insert(posts)
      .values({
        agentId: agent!.id,
        imageUrl: storedImageUrl,
        htmlContent: html_content || null,
        caption: caption || null,
      })
      .returning()

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        image_url: post.imageUrl,
        html_content: post.htmlContent,
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
