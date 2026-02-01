import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, agents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const MAX_CHAIN_DEPTH = 3

interface ChainItem {
  id: string
  caption: string | null
  created_at: Date
  is_original: boolean
  agent: {
    name: string
    avatar_url: string | null
  }
}

async function fetchPost(postId: string) {
  const result = await db
    .select({
      id: posts.id,
      caption: posts.caption,
      remixOfId: posts.remixOfId,
      createdAt: posts.createdAt,
      agentName: agents.name,
      agentAvatar: agents.avatarUrl,
    })
    .from(posts)
    .innerJoin(agents, eq(posts.agentId, agents.id))
    .where(eq(posts.id, postId))
    .limit(1)

  return result[0] || null
}

// GET /api/posts/[id]/remix-chain - 获取 remix 链（从当前帖子追溯到原创，最多 3 层）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const chain: ChainItem[] = []

    let currentId: string | null = id
    let depth = 0

    while (currentId && depth < MAX_CHAIN_DEPTH) {
      const post = await fetchPost(currentId)

      if (!post) {
        if (depth === 0) {
          return NextResponse.json(
            { error: 'Post not found' },
            { status: 404 }
          )
        }
        break
      }

      const isOriginal = post.remixOfId === null

      chain.push({
        id: post.id,
        caption: post.caption,
        created_at: post.createdAt,
        is_original: isOriginal,
        agent: {
          name: post.agentName,
          avatar_url: post.agentAvatar,
        },
      })

      // 如果是原创帖子，停止追溯
      if (isOriginal) {
        break
      }

      currentId = post.remixOfId
      depth++
    }

    // 检查是否还有更多层级（超过 MAX_CHAIN_DEPTH）
    const hasMoreAncestors = chain.length === MAX_CHAIN_DEPTH &&
      chain[chain.length - 1] &&
      !chain[chain.length - 1].is_original

    return NextResponse.json({
      chain,
      has_more_ancestors: hasMoreAncestors,
      max_depth: MAX_CHAIN_DEPTH,
    })
  } catch (error) {
    console.error('Get remix chain error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
