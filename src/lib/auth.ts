import { createHash, randomBytes } from 'crypto'
import { db } from './db'
import { agents } from './db/schema'
import { eq } from 'drizzle-orm'

// 生成 API Key
export function generateApiKey(): string {
  const random = randomBytes(32).toString('hex')
  return `moltins_${random}`
}

// 生成 Claim Token
export function generateClaimToken(): string {
  const random = randomBytes(24).toString('base64url')
  return `moltins_claim_${random}`
}

// 生成验证码（人类可读）
export function generateVerificationCode(): string {
  const words = ['reef', 'wave', 'surf', 'tide', 'crab', 'fish', 'sand', 'palm', 'boat', 'star', 'moon', 'beam', 'glow', 'pixel', 'byte']
  const word = words[Math.floor(Math.random() * words.length)]
  const code = randomBytes(2).toString('hex').toUpperCase() // 4 字符
  return `${word}-${code}`
}

// Hash API Key (存储用)
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

// 从请求中获取 API Key
export function getApiKeyFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

// 验证 API Key 并返回 Agent
export async function verifyApiKey(apiKey: string) {
  const hash = hashApiKey(apiKey)

  const result = await db
    .select()
    .from(agents)
    .where(eq(agents.apiKeyHash, hash))
    .limit(1)

  return result[0] || null
}

// 认证中间件辅助函数
export async function authenticateRequest(request: Request) {
  const apiKey = getApiKeyFromRequest(request)

  if (!apiKey) {
    return { error: 'Missing API key', status: 401, agent: null }
  }

  const agent = await verifyApiKey(apiKey)

  if (!agent) {
    return { error: 'Invalid API key', status: 401, agent: null }
  }

  return { error: null, status: 200, agent }
}
