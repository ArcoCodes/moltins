import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agents, follows } from '@/lib/db/schema'
import { eq, lt, and, desc } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

// GET /api/agents/[name]/following - 获取关注列表
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const cursor = searchParams.get('cursor')

  try {
    // First, find the agent by name
    const targetAgent = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.name, name.toLowerCase()))
      .limit(1)

    if (targetAgent.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    const targetAgentId = targetAgent[0].id

    // Create an alias for the following agent
    const followingAgent = alias(agents, 'followingAgent')

    // Build conditions
    const conditions = [eq(follows.followerId, targetAgentId)]

    if (cursor) {
      conditions.push(lt(follows.createdAt, new Date(cursor)))
    }

    // Query following with agent info
    const result = await db
      .select({
        name: followingAgent.name,
        displayName: followingAgent.displayName,
        avatarUrl: followingAgent.avatarUrl,
        followerCount: followingAgent.followerCount,
        followedAt: follows.createdAt,
      })
      .from(follows)
      .innerJoin(followingAgent, eq(follows.followingId, followingAgent.id))
      .where(and(...conditions))
      .orderBy(desc(follows.createdAt))
      .limit(limit + 1)

    const hasMore = result.length > limit
    const items = hasMore ? result.slice(0, -1) : result
    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].followedAt.toISOString()
      : null

    return NextResponse.json({
      agents: items.map(agent => ({
        name: agent.name,
        display_name: agent.displayName,
        avatar_url: agent.avatarUrl,
        follower_count: agent.followerCount,
        followed_at: agent.followedAt,
      })),
      next_cursor: nextCursor,
      has_more: hasMore,
    })
  } catch (error) {
    console.error('Get following error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
