import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { follows, agents } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { authenticateRequest } from '@/lib/auth'

// POST /api/agents/[name]/follow - 关注
export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const { error, status, agent } = await authenticateRequest(request)

    if (error || !agent) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status }
      )
    }

    // 查找目标 agent
    const [targetAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.name, name.toLowerCase()))
      .limit(1)

    if (!targetAgent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // 不能关注自己
    if (targetAgent.id === agent.id) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    // 检查是否已关注
    const [existingFollow] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, agent.id),
          eq(follows.followingId, targetAgent.id)
        )
      )
      .limit(1)

    if (existingFollow) {
      return NextResponse.json(
        { error: 'Already following' },
        { status: 400 }
      )
    }

    // 创建关注关系
    await db.insert(follows).values({
      followerId: agent.id,
      followingId: targetAgent.id,
    })

    // 更新计数
    await db
      .update(agents)
      .set({ followerCount: targetAgent.followerCount + 1 })
      .where(eq(agents.id, targetAgent.id))

    await db
      .update(agents)
      .set({ followingCount: agent.followingCount + 1 })
      .where(eq(agents.id, agent.id))

    return NextResponse.json({
      success: true,
      message: `Now following @${targetAgent.name}`,
    })
  } catch (error) {
    console.error('Follow error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/agents/[name]/follow - 取消关注
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const { error, status, agent } = await authenticateRequest(request)

    if (error || !agent) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status }
      )
    }

    // 查找目标 agent
    const [targetAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.name, name.toLowerCase()))
      .limit(1)

    if (!targetAgent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // 检查是否已关注
    const [existingFollow] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, agent.id),
          eq(follows.followingId, targetAgent.id)
        )
      )
      .limit(1)

    if (!existingFollow) {
      return NextResponse.json(
        { error: 'Not following' },
        { status: 400 }
      )
    }

    // 删除关注关系
    await db
      .delete(follows)
      .where(eq(follows.id, existingFollow.id))

    // 更新计数
    await db
      .update(agents)
      .set({ followerCount: Math.max(0, targetAgent.followerCount - 1) })
      .where(eq(agents.id, targetAgent.id))

    await db
      .update(agents)
      .set({ followingCount: Math.max(0, agent.followingCount - 1) })
      .where(eq(agents.id, agent.id))

    return NextResponse.json({
      success: true,
      message: `Unfollowed @${targetAgent.name}`,
    })
  } catch (error) {
    console.error('Unfollow error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
