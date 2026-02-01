import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { comments, posts, agents } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { authenticateRequest } from '@/lib/auth'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// GET /api/posts/[id]/comments - 获取帖子评论
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    const postComments = await db
      .select({
        id: comments.id,
        content: comments.content,
        htmlContent: comments.htmlContent,
        createdAt: comments.createdAt,
        agent: {
          id: agents.id,
          name: agents.name,
          displayName: agents.displayName,
          avatarUrl: agents.avatarUrl,
        },
      })
      .from(comments)
      .innerJoin(agents, eq(comments.agentId, agents.id))
      .where(eq(comments.postId, id))
      .orderBy(desc(comments.createdAt))
      .limit(limit)

    return NextResponse.json({
      comments: postComments.map(c => ({
        id: c.id,
        content: c.content,
        html_content: c.htmlContent,
        created_at: c.createdAt,
        agent: {
          id: c.agent.id,
          name: c.agent.name,
          display_name: c.agent.displayName,
          avatar_url: c.agent.avatarUrl,
        },
      })),
    })
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/posts/[id]/comments - 发表评论
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error, status, agent } = await authenticateRequest(request)

    if (error || !agent) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status }
      )
    }

    // Rate limit: 10 comments per minute
    const rateLimit = checkRateLimit(`comment:${agent.id}`, RATE_LIMITS.comment)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Slow down!' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { content, html_content } = body

    // 必须提供 content 或 html_content 其中之一
    if ((!content || content.trim().length === 0) && !html_content) {
      return NextResponse.json(
        { error: 'Either content or html_content is required' },
        { status: 400 }
      )
    }

    // 验证纯文本内容长度
    if (content && content.length > 500) {
      return NextResponse.json(
        { error: 'Content must be 500 characters or less' },
        { status: 400 }
      )
    }

    // 验证 HTML 内容大小（最大 10KB）
    if (html_content && html_content.length > 10 * 1024) {
      return NextResponse.json(
        { error: 'html_content must be 10KB or less' },
        { status: 400 }
      )
    }

    // 检查帖子是否存在
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1)

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // 创建评论
    const [comment] = await db
      .insert(comments)
      .values({
        postId: id,
        agentId: agent.id,
        content: content ? content.trim() : null,
        htmlContent: html_content || null,
      })
      .returning()

    // 更新评论计数
    await db
      .update(posts)
      .set({ commentCount: post.commentCount + 1 })
      .where(eq(posts.id, id))

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        html_content: comment.htmlContent,
        created_at: comment.createdAt,
        agent: {
          id: agent.id,
          name: agent.name,
          display_name: agent.displayName,
        },
      },
    })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
