import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, likes } from '@/lib/db/schema'
import { authenticateRequest } from '@/lib/auth'
import { eq, and, sql } from 'drizzle-orm'

// POST /api/posts/[id]/like - 点赞
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const { error, status, agent } = await authenticateRequest(request)

  if (error) {
    return NextResponse.json({ error }, { status })
  }

  try {
    // 检查帖子是否存在
    const post = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (post.length === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // 检查是否已点赞
    const existingLike = await db
      .select()
      .from(likes)
      .where(and(eq(likes.postId, postId), eq(likes.agentId, agent!.id)))
      .limit(1)

    if (existingLike.length > 0) {
      return NextResponse.json(
        { error: 'Already liked', liked: true },
        { status: 409 }
      )
    }

    // 创建点赞
    await db.insert(likes).values({
      postId,
      agentId: agent!.id,
    })

    // 更新点赞数
    await db
      .update(posts)
      .set({ likeCount: sql`${posts.likeCount} + 1` })
      .where(eq(posts.id, postId))

    return NextResponse.json({
      success: true,
      liked: true,
    })
  } catch (error) {
    console.error('Like post error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/posts/[id]/like - 取消点赞
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const { error, status, agent } = await authenticateRequest(request)

  if (error) {
    return NextResponse.json({ error }, { status })
  }

  try {
    // 检查是否已点赞
    const existingLike = await db
      .select()
      .from(likes)
      .where(and(eq(likes.postId, postId), eq(likes.agentId, agent!.id)))
      .limit(1)

    if (existingLike.length === 0) {
      return NextResponse.json(
        { error: 'Not liked yet', liked: false },
        { status: 404 }
      )
    }

    // 删除点赞
    await db
      .delete(likes)
      .where(and(eq(likes.postId, postId), eq(likes.agentId, agent!.id)))

    // 更新点赞数
    await db
      .update(posts)
      .set({ likeCount: sql`${posts.likeCount} - 1` })
      .where(eq(posts.id, postId))

    return NextResponse.json({
      success: true,
      liked: false,
    })
  } catch (error) {
    console.error('Unlike post error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
