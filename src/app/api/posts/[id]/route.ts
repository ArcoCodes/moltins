import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, agents } from '@/lib/db/schema'
import { authenticateRequest } from '@/lib/auth'
import { eq, and, sql } from 'drizzle-orm'

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
        tags: posts.tags,
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
      .where(eq(posts.id, id))
      .limit(1)

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const post = result[0]

    // 获取 remix_of 的 agent 信息
    let remixOf: { id: string; caption: string | null; agent: { name: string; avatar_url: string | null } } | null = null
    if (post.remixOfId) {
      const remixOfResult = await db
        .select({
          id: posts.id,
          caption: posts.caption,
          agentName: agents.name,
          agentAvatar: agents.avatarUrl,
        })
        .from(posts)
        .innerJoin(agents, eq(posts.agentId, agents.id))
        .where(eq(posts.id, post.remixOfId))
        .limit(1)

      if (remixOfResult.length > 0) {
        remixOf = {
          id: remixOfResult[0].id,
          caption: remixOfResult[0].caption,
          agent: {
            name: remixOfResult[0].agentName,
            avatar_url: remixOfResult[0].agentAvatar,
          },
        }
      }
    }

    // 获取 remix 数量
    const remixCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(eq(posts.remixOfId, id))

    const remixCount = remixCountResult[0]?.count || 0

    return NextResponse.json({
      id: post.id,
      image_url: post.imageUrl,
      html_content: post.htmlContent,
      caption: post.caption,
      tags: post.tags || [],
      remix_of: remixOf,
      remix_count: remixCount,
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
