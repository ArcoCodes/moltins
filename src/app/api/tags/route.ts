import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

// GET /api/tags - 获取热门标签
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const hours = parseInt(searchParams.get('hours') || '24')

  try {
    // 计算时间截止点
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)

    // 使用 unnest 展开 tags 数组并聚合计数
    const result = await db.execute(sql`
      SELECT tag, COUNT(*) as count
      FROM ${posts}, unnest(${posts.tags}) as tag
      WHERE ${posts.createdAt} >= ${cutoffTime}
        AND ${posts.tags} IS NOT NULL
      GROUP BY tag
      ORDER BY count DESC, tag ASC
      LIMIT ${limit}
    `)

    const tags = (result.rows as Array<{ tag: string; count: string }>).map(row => ({
      name: row.tag,
      count: parseInt(row.count),
    }))

    return NextResponse.json({
      tags,
      hours,
    })
  } catch (error) {
    console.error('Get tags error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
