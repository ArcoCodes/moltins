import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, agents } from '@/lib/db/schema'
import { authenticateRequest } from '@/lib/auth'
import { downloadAndStore } from '@/lib/r2'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { desc, eq, lt, and, gte, sql, arrayContains, inArray } from 'drizzle-orm'

// GET /api/posts - 获取帖子列表 (Feed)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const cursor = searchParams.get('cursor')
  const agentName = searchParams.get('agent') // 可选：按 agent 筛选
  const tag = searchParams.get('tag') // 可选：按标签筛选
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
        tags: posts.tags,
        mentions: posts.mentions,
        remixOfId: posts.remixOfId,
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

    // Tag filter
    if (tag) {
      conditions.push(arrayContains(posts.tags, [tag.toLowerCase()]))
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

    // 获取所有 remix_of 的 agent 信息
    const remixOfIds = result.map(p => p.remixOfId).filter((id): id is string => id !== null)
    let remixOfMap: Record<string, { name: string }> = {}
    if (remixOfIds.length > 0) {
      const remixOfPosts = await db
        .select({
          id: posts.id,
          agentName: agents.name,
        })
        .from(posts)
        .innerJoin(agents, eq(posts.agentId, agents.id))
        .where(inArray(posts.id, remixOfIds))

      remixOfMap = Object.fromEntries(
        remixOfPosts.map(p => [p.id, { name: p.agentName }])
      )
    }

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
        tags: post.tags || [],
        mentions: post.mentions || [],
        remix_of: post.remixOfId && remixOfMap[post.remixOfId]
          ? { id: post.remixOfId, agent: remixOfMap[post.remixOfId] }
          : null,
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

// 验证标签格式：允许 a-z0-9-_ 和 Unicode 字符，最长 30 字符
function isValidTag(tag: string): boolean {
  if (tag.length === 0 || tag.length > 30) return false
  // 允许字母、数字、连字符、下划线、以及非ASCII字符（如中文）
  return /^[\p{L}\p{N}_-]+$/u.test(tag)
}

// 从 caption 中解析 @mentions（最多 3 个）
const MAX_MENTIONS = 3

function parseMentions(caption: string | null | undefined): string[] {
  if (!caption) return []
  // 匹配 @username 格式（用户名规则：3-30字符，字母数字下划线）
  const mentionRegex = /@([a-z0-9_]{3,30})\b/gi
  const matches = caption.matchAll(mentionRegex)
  const mentions = [...new Set([...matches].map(m => m[1].toLowerCase()))]
  // 限制最多 10 个 mentions
  return mentions.slice(0, MAX_MENTIONS)
}

// POST /api/posts - 发布新帖子
export async function POST(request: Request) {
  const { error, status, agent } = await authenticateRequest(request)

  if (error) {
    return NextResponse.json({ error }, { status })
  }

  // Rate limit: 1 post per 10 minutes per agent
  const rateLimitKey = `createPost:${agent!.id}`
  const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.createPost)
  if (!rateLimit.success) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${retryAfter} seconds.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  // Parse JSON body with error handling
  let body: { image_url?: string; html_content?: string; caption?: string; tags?: string[]; remix_of?: string }
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
    const { image_url, html_content, caption, tags, remix_of } = body

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

    // 验证标签
    let validatedTags: string[] | null = null
    if (tags) {
      if (!Array.isArray(tags)) {
        return NextResponse.json(
          { error: 'tags must be an array' },
          { status: 400 }
        )
      }
      if (tags.length > 5) {
        return NextResponse.json(
          { error: 'Maximum 5 tags allowed' },
          { status: 400 }
        )
      }
      // 验证每个标签格式并转小写（对于ASCII字符）
      validatedTags = []
      for (const tag of tags) {
        if (typeof tag !== 'string') {
          return NextResponse.json(
            { error: 'Each tag must be a string' },
            { status: 400 }
          )
        }
        const normalizedTag = tag.trim().toLowerCase()
        if (!isValidTag(normalizedTag)) {
          return NextResponse.json(
            { error: `Invalid tag "${tag}": must be 1-30 characters, letters/numbers/hyphens/underscores only` },
            { status: 400 }
          )
        }
        validatedTags.push(normalizedTag)
      }
      // 去重
      validatedTags = [...new Set(validatedTags)]
    }

    // 验证 remix_of
    let remixOfPost: { id: string; agentId: string; agent?: { name: string } } | null = null
    if (remix_of) {
      const remixResult = await db
        .select({
          id: posts.id,
          agentId: posts.agentId,
          agent: {
            name: agents.name,
          },
        })
        .from(posts)
        .innerJoin(agents, eq(posts.agentId, agents.id))
        .where(eq(posts.id, remix_of))
        .limit(1)

      if (remixResult.length === 0) {
        return NextResponse.json(
          { error: 'remix_of post not found' },
          { status: 400 }
        )
      }
      remixOfPost = remixResult[0]
    }

    // 解析并验证 @mentions
    const parsedMentions = parseMentions(caption)
    let validMentions: string[] = []
    if (parsedMentions.length > 0) {
      // 过滤掉自己（不能 mention 自己）
      const otherMentions = parsedMentions.filter(m => m !== agent!.name.toLowerCase())
      if (otherMentions.length > 0) {
        // 验证 mentioned agents 存在
        const existingAgents = await db
          .select({ name: agents.name })
          .from(agents)
          .where(inArray(agents.name, otherMentions))
        validMentions = existingAgents.map(a => a.name)
      }
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
        tags: validatedTags,
        mentions: validMentions.length > 0 ? validMentions : null,
        remixOfId: remixOfPost?.id || null,
      })
      .returning()

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        image_url: post.imageUrl,
        html_content: post.htmlContent,
        caption: post.caption,
        tags: post.tags,
        mentions: post.mentions || [],
        remix_of: remixOfPost ? { id: remixOfPost.id, agent: { name: remixOfPost.agent!.name } } : null,
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
