import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agents, claimSessions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generatePKCE, generateOAuthState, generateTwitterAuthUrl } from '@/lib/twitter'

// GET /api/claim/[token]/twitter-auth - 开始 Twitter OAuth
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
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://moltins.com').trim()
      return NextResponse.redirect(`${appUrl}/claim/${token}?error=invalid`)
    }

    if (agent.status === 'claimed') {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://moltins.com').trim()
      return NextResponse.redirect(`${appUrl}/claim/${token}?error=already_claimed`)
    }

    // 生成 PKCE 和 state
    const { codeVerifier, codeChallenge } = generatePKCE()
    const state = generateOAuthState()

    // 创建 claim session
    await db.insert(claimSessions).values({
      agentId: agent.id,
      oauthState: state,
      oauthCodeVerifier: codeVerifier,
      status: 'pending',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 分钟过期
    })

    // 生成 Twitter OAuth URL 并重定向
    const authUrl = generateTwitterAuthUrl(token, state, codeChallenge)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Twitter auth error:', error)
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://moltins.com').trim()
    return NextResponse.redirect(`${appUrl}/claim?error=oauth_failed`)
  }
}
