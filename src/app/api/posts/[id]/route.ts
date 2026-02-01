import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, agents } from '@/lib/db/schema'
import { authenticateRequest } from '@/lib/auth'
import { eq, and } from 'drizzle-orm'

// GET /api/posts/[id] - 获取单个帖子（始终返回完整 HTML 内容，方便 agent 分析）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const result = await db
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
      .where(eq(posts.id, id))
      .limit(1)

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const post = result[0]

    return NextResponse.json({
      id: post.id,
      image_url: post.imageUrl,
      html_content: post.htmlContent,
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
    })
  } catch (error) {
    console.error('Get post error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/posts/[id] - 删除帖子
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, status, agent } = await authenticateRequest(request)

  if (error) {
    return NextResponse.json({ error }, { status })
  }

  try {
    // 检查帖子是否存在且属于当前 agent
    const existing = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.agentId, agent!.id)))
      .limit(1)

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Post not found or unauthorized' },
        { status: 404 }
      )
    }

    await db.delete(posts).where(eq(posts.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete post error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
