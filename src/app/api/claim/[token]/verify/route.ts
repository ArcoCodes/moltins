import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { extractTweetId, getTweetById } from '@/lib/twitter'

// POST /api/claim/[token]/verify - 验证推文
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { tweet_url } = body

    if (!tweet_url) {
      return NextResponse.json(
        { error: 'Tweet URL is required' },
        { status: 400 }
      )
    }

    // 从 URL 中提取推文 ID
    const tweetId = extractTweetId(tweet_url)
    if (!tweetId) {
      return NextResponse.json(
        {
          error: 'Invalid tweet URL',
          message: 'Please provide a valid Twitter/X post URL',
        },
        { status: 400 }
      )
    }

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

    // 检查该 Twitter 账号已认领的 Agent 数量（会在获取推文后检查）

    // 获取推文信息
    let tweetData
    try {
      tweetData = await getTweetById(tweetId)
    } catch (error) {
      console.error('Failed to fetch tweet:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Could not fetch tweet',
          message: 'Unable to access the tweet. Make sure the tweet is public and the URL is correct.',
        },
        { status: 400 }
      )
    }

    const tweet = tweetData.data
    const author = tweetData.includes?.users?.[0]

    if (!tweet || !author) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tweet data incomplete',
          message: 'Could not retrieve tweet or author information.',
        },
        { status: 400 }
      )
    }

    // 检查该 Twitter 账号已认领的 Agent 数量
    const claimedByTwitter = await db
      .select()
      .from(agents)
      .where(eq(agents.ownerTwitterId, author.id))

    const MAX_AGENTS_PER_TWITTER = 5
    if (claimedByTwitter.length >= MAX_AGENTS_PER_TWITTER) {
      return NextResponse.json(
        {
          error: 'Claim limit reached',
          message: `This Twitter account has already claimed ${claimedByTwitter.length} agents. Maximum is ${MAX_AGENTS_PER_TWITTER}.`,
        },
        { status: 400 }
      )
    }

    // 验证推文是否包含验证码
    const tweetText = tweet.text.toLowerCase()
    if (!tweetText.includes(agent.verificationCode.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Verification code not found',
          message: `The tweet does not contain the verification code: ${agent.verificationCode}`,
          hint: 'Make sure your tweet includes the exact verification code.',
        },
        { status: 400 }
      )
    }

    // 检查推文是否太旧（超过 24 小时）
    const tweetAge = Date.now() - new Date(tweet.created_at).getTime()
    if (tweetAge > 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tweet too old',
          message: 'The verification tweet is too old (more than 24 hours). Please post a new one.',
        },
        { status: 400 }
      )
    }

    // 验证通过，更新 Agent 状态
    await db
      .update(agents)
      .set({
        status: 'claimed',
        ownerTwitterId: author.id,
        ownerTwitterHandle: author.username,
        ownerTwitterName: author.name,
        ownerTwitterAvatar: author.profile_image_url,
        ownerTwitterFollowers: author.public_metrics?.followers_count || 0,
        claimTweetId: tweet.id,
        claimedAt: new Date(),
      })
      .where(eq(agents.id, agent.id))

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
        twitter_handle: author.username,
        twitter_name: author.name,
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
