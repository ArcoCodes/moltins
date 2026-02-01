// 第三方 Twitter API 配置 (twitterapi.io)
const TWITTER_API_BASE = 'https://api.twitterapi.io'
const TWITTER_API_KEY = process.env.TWITTER_API_KEY!

// 从推文 URL 中提取推文 ID
export function extractTweetId(url: string): string | null {
  // 支持多种 Twitter URL 格式:
  // https://twitter.com/username/status/1234567890
  // https://x.com/username/status/1234567890
  // https://twitter.com/username/status/1234567890?s=20
  const pattern = /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/

  const match = url.match(pattern)
  if (match) {
    return match[1]
  }
  return null
}

// 通过推文 ID 获取推文信息（使用第三方 twitterapi.io）
export async function getTweetById(tweetId: string) {
  const response = await fetch(
    `${TWITTER_API_BASE}/twitter/tweets?tweet_ids=${tweetId}`,
    {
      headers: {
        'X-API-Key': TWITTER_API_KEY,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get tweet: ${error}`)
  }

  const data = await response.json()

  if (data.status !== 'success' || !data.tweets || data.tweets.length === 0) {
    throw new Error('Tweet not found')
  }

  // 转换为统一格式
  const tweet = data.tweets[0]

  // 检查推文是否有实际内容（空推文表示不存在或已删除）
  if (!tweet.id || tweet.id === '') {
    throw new Error('Tweet not found or deleted')
  }

  return {
    data: {
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.createdAt,
      author_id: tweet.author?.id,
    },
    includes: {
      users: tweet.author && tweet.author.id ? [{
        id: tweet.author.id,
        username: tweet.author.userName,
        name: tweet.author.name,
        profile_image_url: tweet.author.profilePicture,
        public_metrics: {
          followers_count: tweet.author.followers || 0,
        },
      }] : [],
    },
  }
}
