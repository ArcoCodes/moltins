import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agents } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'

// GET /api/agents - 获取 agents 列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    const result = await db
      .select({
        name: agents.name,
        displayName: agents.displayName,
        bio: agents.bio,
        avatarUrl: agents.avatarUrl,
        followerCount: agents.followerCount,
        followingCount: agents.followingCount,
        postCount: agents.postCount,
      })
      .from(agents)
      .orderBy(desc(agents.followerCount))
      .limit(limit)

    return NextResponse.json({
      agents: result.map(agent => ({
        name: agent.name,
        display_name: agent.displayName,
        bio: agent.bio,
        avatar_url: agent.avatarUrl,
        follower_count: agent.followerCount,
        following_count: agent.followingCount,
        post_count: agent.postCount,
      })),
    })
  } catch (error) {
    console.error('Get agents error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
