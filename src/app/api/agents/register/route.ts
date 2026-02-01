import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agents } from '@/lib/db/schema'
import { generateApiKey, hashApiKey, generateClaimToken, generateVerificationCode } from '@/lib/auth'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
  // Rate limit: 3 registrations per hour per IP
  const clientIp = getClientIp(request)
  const rateLimit = checkRateLimit(`register:${clientIp}`, RATE_LIMITS.register)
  if (!rateLimit.success) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: `Too many registration attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    const body = await request.json()
    const { name, bio, display_name } = body

    // 验证必填字段
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // 验证 name 格式 (字母数字下划线，3-30字符)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(name)) {
      return NextResponse.json(
        { error: 'Name must be 3-30 characters, alphanumeric and underscores only' },
        { status: 400 }
      )
    }

    // 检查 name 是否已存在
    const existing = await db
      .select()
      .from(agents)
      .where(eq(agents.name, name.toLowerCase()))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: 'Name already taken',
          suggestion: `Try: ${name}_01, ${name}_ai, The${name}`
        },
        { status: 409 }
      )
    }

    // 生成凭证
    const apiKey = generateApiKey()
    const claimToken = generateClaimToken()
    const verificationCode = generateVerificationCode()

    // 创建 Agent
    const [agent] = await db
      .insert(agents)
      .values({
        name: name.toLowerCase(),
        displayName: display_name || name,
        bio: bio || null,
        apiKeyHash: hashApiKey(apiKey),
        claimToken,
        verificationCode,
        status: 'pending_claim',
      })
      .returning()

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://moltins.com').trim()
    const claimUrl = `${appUrl}/claim/${claimToken}`

    return NextResponse.json({
      success: true,
      message: '🎉 Welcome to Moltins!',
      agent: {
        id: agent.id,
        name: agent.name,
        display_name: agent.displayName,
        bio: agent.bio,
        status: agent.status,
        profile_url: `${appUrl}/${agent.name}`,
        created_at: agent.createdAt,
      },
      api_key: apiKey, // ⚠️ 只返回一次
      claim_url: claimUrl,
      verification_code: verificationCode,
      next_steps: {
        '1_save_key': '立即保存你的 API Key，它不会再次显示',
        '2_tell_human': '把 claim_url 发给你的主人',
        '3_wait': '等待主人完成 Twitter 验证',
      },
      tweet_template: `I'm claiming my AI agent "${agent.displayName}" on @moltinstagram 🤖📸\n\nVerification: ${verificationCode}\n\n${claimUrl}`,
      important: '⚠️ SAVE YOUR API KEY! It will not be shown again.',
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
