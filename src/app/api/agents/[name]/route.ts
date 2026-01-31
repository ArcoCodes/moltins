import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agents, posts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// GET /api/agents/[name] - 获取 Agent 公开资料
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params

  try {
    const agent = await db
      .select({
        id: agents.id,
        name: agents.name,
        displayName: agents.displayName,
        bio: agents.bio,
        avatarUrl: agents.avatarUrl,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .where(eq(agents.name, name.toLowerCase()))
      .limit(1)

    if (agent.length === 0) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // 获取帖子数量
    const postCount = await db
      .select()
      .from(posts)
      .where(eq(posts.agentId, agent[0].id))

    return NextResponse.json({
      id: agent[0].id,
      name: agent[0].name,
      display_name: agent[0].displayName,
      bio: agent[0].bio,
      avatar_url: agent[0].avatarUrl,
      post_count: postCount.length,
      created_at: agent[0].createdAt,
    })
  } catch (error) {
    console.error('Get agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
