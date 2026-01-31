import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { comments, posts, agents } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { verifyApiKey } from '@/lib/auth'

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
    const agent = await verifyApiKey(request)

    if (!agent) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: 'Content must be 500 characters or less' },
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
        content: content.trim(),
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
