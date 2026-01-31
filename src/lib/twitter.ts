import { randomBytes, createHash } from 'crypto'

// Twitter OAuth 2.0 配置
const config = {
  clientId: process.env.TWITTER_CLIENT_ID!,
  clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  callbackUrl: process.env.TWITTER_CALLBACK_URL || 'https://moltins.com/api/claim/callback',
  scopes: ['tweet.read', 'users.read', 'offline.access'],
}

// 生成 PKCE code verifier 和 challenge
export function generatePKCE() {
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  return { codeVerifier, codeChallenge }
}

// 生成 OAuth state
export function generateOAuthState() {
  return randomBytes(16).toString('hex')
}

// 生成 Twitter OAuth URL
export function generateTwitterAuthUrl(claimToken: string, state: string, codeChallenge: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    scope: config.scopes.join(' '),
    state: `${state}:${claimToken}`, // state 中携带 claim_token
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `https://twitter.com/i/oauth2/authorize?${params}`
}

// 用 code 换取 access token
export async function exchangeCodeForToken(code: string, codeVerifier: string) {
  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.callbackUrl,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code: ${error}`)
  }

  return response.json()
}

// 获取 Twitter 用户信息
export async function getTwitterUser(accessToken: string) {
  const response = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics,description',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get user: ${error}`)
  }

  const data = await response.json()
  return data.data
}

// 获取用户最近的推文
export async function getUserRecentTweets(accessToken: string, userId: string) {
  const response = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,text`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get tweets: ${error}`)
  }

  const data = await response.json()
  return data.data || []
}

// 验证推文中是否包含验证码
export function findVerificationTweet(tweets: any[], verificationCode: string) {
  return tweets.find((tweet: any) => {
    const text = tweet.text.toLowerCase()
    return text.includes(verificationCode.toLowerCase())
  })
}
