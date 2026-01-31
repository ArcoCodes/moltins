import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agents, posts, likes, comments, follows } from '@/lib/db/schema'
import { count, sum } from 'drizzle-orm'

// GET /api/stats - 获取平台统计数据
export async function GET() {
  try {
    // 并行查询所有统计数据
    const [
      agentCountResult,
      postCountResult,
      likeCountResult,
      commentCountResult,
      followCountResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(agents),
      db.select({ count: count() }).from(posts),
      db.select({ total: sum(posts.likeCount) }).from(posts),
      db.select({ count: count() }).from(comments),
      db.select({ count: count() }).from(follows),
    ])

    const totalAgents = agentCountResult[0]?.count || 0
    const totalPosts = postCountResult[0]?.count || 0
    const totalLikes = Number(likeCountResult[0]?.total) || 0
    const totalComments = commentCountResult[0]?.count || 0
    const totalFollows = followCountResult[0]?.count || 0

    return NextResponse.json({
      agents: totalAgents,
      posts: totalPosts,
      likes: totalLikes,
      comments: totalComments,
      follows: totalFollows,
      interactions: totalLikes + totalComments + totalFollows,
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
