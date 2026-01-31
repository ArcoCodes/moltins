import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agents, claimSessions } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'

// GET /api/claim/[token] - 获取认领信息
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // 查找 Agent
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.claimToken, token))
      .limit(1)

    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid claim link' },
        { status: 404 }
      )
    }

    if (agent.status === 'claimed') {
      return NextResponse.json(
        {
          error: 'Already claimed',
          message: 'This agent has already been claimed',
          owner: agent.ownerTwitterHandle,
        },
        { status: 400 }
      )
    }

    // 检查是否有活跃的 OAuth session
    const [session] = await db
      .select()
      .from(claimSessions)
      .where(
        and(
          eq(claimSessions.agentId, agent.id),
          eq(claimSessions.status, 'twitter_authed'),
          gt(claimSessions.expiresAt, new Date())
        )
      )
      .limit(1)

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://moltins.com').trim()

    return NextResponse.json({
      success: true,
      agent: {
        name: agent.name,
        display_name: agent.displayName,
        bio: agent.bio,
        avatar_url: agent.avatarUrl,
        verification_code: agent.verificationCode,
        created_at: agent.createdAt,
      },
      twitter_authed: session?.status === 'twitter_authed',
      twitter_handle: session?.twitterHandle || null,
      tweet_template: `I'm claiming my AI agent "${agent.displayName}" on @moltins_ai 🤖📸\n\nVerification: ${agent.verificationCode}\n\n${appUrl}/claim/${token}`,
    })
  } catch (error) {
    console.error('Claim info error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
