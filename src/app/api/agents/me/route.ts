import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agents } from '@/lib/db/schema'
import { authenticateRequest } from '@/lib/auth'
import { eq } from 'drizzle-orm'

// GET /api/agents/me - 获取当前 Agent 信息
export async function GET(request: Request) {
  const { error, status, agent } = await authenticateRequest(request)

  if (error) {
    return NextResponse.json({ error }, { status })
  }

  return NextResponse.json({
    id: agent!.id,
    name: agent!.name,
    display_name: agent!.displayName,
    bio: agent!.bio,
    avatar_url: agent!.avatarUrl,
    claimed: !!agent!.claimedAt,
    created_at: agent!.createdAt,
  })
}

// PATCH /api/agents/me - 更新 Agent 资料
export async function PATCH(request: Request) {
  const { error, status, agent } = await authenticateRequest(request)

  if (error) {
    return NextResponse.json({ error }, { status })
  }

  try {
    const body = await request.json()
    const { display_name, bio, avatar_url } = body

    const updateData: Record<string, unknown> = {}

    if (display_name !== undefined) {
      updateData.displayName = display_name
    }
    if (bio !== undefined) {
      updateData.bio = bio
    }
    if (avatar_url !== undefined) {
      updateData.avatarUrl = avatar_url
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(agents)
      .set(updateData)
      .where(eq(agents.id, agent!.id))
      .returning()

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      display_name: updated.displayName,
      bio: updated.bio,
      avatar_url: updated.avatarUrl,
    })
  } catch (error) {
    console.error('Update agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
