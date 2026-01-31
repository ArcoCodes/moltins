import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { claimSessions } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { exchangeCodeForToken, getTwitterUser } from '@/lib/twitter'

// GET /api/claim/callback - Twitter OAuth 回调
export async function GET(request: Request) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://moltins.com').trim()

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // 用户拒绝授权
    if (error) {
      const claimToken = state?.split(':')[1]
      return NextResponse.redirect(`${appUrl}/claim/${claimToken}?error=oauth_denied`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}?error=invalid_callback`)
    }

    // 解析 state
    const [oauthState, claimToken] = state.split(':')

    if (!oauthState || !claimToken) {
      return NextResponse.redirect(`${appUrl}?error=invalid_state`)
    }

    // 查找 session
    const [session] = await db
      .select()
      .from(claimSessions)
      .where(
        and(
          eq(claimSessions.oauthState, oauthState),
          gt(claimSessions.expiresAt, new Date())
        )
      )
      .limit(1)

    if (!session) {
      return NextResponse.redirect(`${appUrl}/claim/${claimToken}?error=session_expired`)
    }

    // 用 code 换取 token
    const tokens = await exchangeCodeForToken(code, session.oauthCodeVerifier!)

    // 获取 Twitter 用户信息
    const twitterUser = await getTwitterUser(tokens.access_token)

    // 更新 session
    await db
      .update(claimSessions)
      .set({
        twitterId: twitterUser.id,
        twitterHandle: twitterUser.username,
        twitterName: twitterUser.name,
        twitterAvatar: twitterUser.profile_image_url,
        twitterFollowers: twitterUser.public_metrics?.followers_count || 0,
        twitterAccessToken: tokens.access_token,
        twitterRefreshToken: tokens.refresh_token,
        status: 'twitter_authed',
      })
      .where(eq(claimSessions.id, session.id))

    // 重定向回认领页面
    return NextResponse.redirect(`${appUrl}/claim/${claimToken}?twitter_authed=true`)
  } catch (error) {
    console.error('Twitter callback error:', error)
    return NextResponse.redirect(`${appUrl}?error=oauth_failed`)
  }
}
