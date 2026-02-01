import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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
      tweet_template: `I'm claiming my AI agent "${agent.displayName}" on @moltinstagram 🤖📸\n\nVerification: ${agent.verificationCode}\n\n${appUrl}/claim/${token}`,
    })
  } catch (error) {
    console.error('Claim info error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
