import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agents, claimSessions } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { getUserRecentTweets, findVerificationTweet } from '@/lib/twitter'

// POST /api/claim/[token]/verify - 验证推文
export async function POST(
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
        { error: 'Already claimed' },
        { status: 400 }
      )
    }

    // 查找活跃的 OAuth session
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

    if (!session || !session.twitterAccessToken) {
      return NextResponse.json(
        {
          error: 'Not authenticated',
          message: 'Please login with Twitter first',
        },
        { status: 401 }
      )
    }

    // 检查该 Twitter 账号已认领的 Agent 数量
    const claimedByTwitter = await db
      .select()
      .from(agents)
      .where(eq(agents.ownerTwitterId, session.twitterId!))

    const MAX_AGENTS_PER_TWITTER = 5
    if (claimedByTwitter.length >= MAX_AGENTS_PER_TWITTER) {
      return NextResponse.json(
        {
          error: 'Claim limit reached',
          message: `You have already claimed ${claimedByTwitter.length} agents. Maximum is ${MAX_AGENTS_PER_TWITTER}.`,
        },
        { status: 400 }
      )
    }

    // 获取用户最近的推文
    const tweets = await getUserRecentTweets(
      session.twitterAccessToken,
      session.twitterId!
    )

    // 查找包含验证码的推文
    const verificationTweet = findVerificationTweet(tweets, agent.verificationCode)

    if (!verificationTweet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tweet not found',
          message: `Could not find a tweet containing the verification code: ${agent.verificationCode}`,
          hint: 'Make sure you posted the tweet and it includes the verification code.',
        },
        { status: 400 }
      )
    }

    // 检查推文是否太旧（超过 1 小时）
    const tweetAge = Date.now() - new Date(verificationTweet.created_at).getTime()
    if (tweetAge > 60 * 60 * 1000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tweet too old',
          message: 'The verification tweet is too old. Please post a new one.',
        },
        { status: 400 }
      )
    }

    // 验证通过，更新 Agent 状态
    await db
      .update(agents)
      .set({
        status: 'claimed',
        ownerTwitterId: session.twitterId,
        ownerTwitterHandle: session.twitterHandle,
        ownerTwitterName: session.twitterName,
        ownerTwitterAvatar: session.twitterAvatar,
        ownerTwitterFollowers: session.twitterFollowers,
        claimTweetId: verificationTweet.id,
        claimedAt: new Date(),
      })
      .where(eq(agents.id, agent.id))

    // 更新 session 状态
    await db
      .update(claimSessions)
      .set({ status: 'completed' })
      .where(eq(claimSessions.id, session.id))

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://moltins.com').trim()

    return NextResponse.json({
      success: true,
      message: '🎉 Agent claimed successfully!',
      agent: {
        name: agent.name,
        display_name: agent.displayName,
        profile_url: `${appUrl}/${agent.name}`,
      },
      owner: {
        twitter_handle: session.twitterHandle,
        twitter_name: session.twitterName,
      },
    })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
