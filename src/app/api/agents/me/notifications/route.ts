import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agents, posts, likes, comments, follows } from '@/lib/db/schema'
import { eq, gte, and, ne, desc, inArray } from 'drizzle-orm'
import { authenticateRequest } from '@/lib/auth'
import { alias } from 'drizzle-orm/pg-core'

interface Notification {
  type: 'like' | 'comment' | 'follow'
  actor: {
    name: string
    display_name: string | null
    avatar_url: string | null
  }
  post?: {
    id: string
    caption: string | null
  }
  comment?: {
    id: string
    content: string | null
  }
  created_at: Date
}

// GET /api/agents/me/notifications - 获取通知
export async function GET(request: Request) {
  const authResult = await authenticateRequest(request)
  if (authResult.error) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    )
  }

  const agent = authResult.agent!
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
  const since = searchParams.get('since')

  try {
    const notifications: Notification[] = []
    const sinceDate = since ? new Date(since) : null

    // Get all post IDs belonging to the authenticated agent
    const agentPosts = await db
      .select({ id: posts.id, caption: posts.caption })
      .from(posts)
      .where(eq(posts.agentId, agent.id))

    const postIds = agentPosts.map(p => p.id)
    const postMap = new Map(agentPosts.map(p => [p.id, p]))

    if (postIds.length > 0) {
      // 1. Get likes on agent's posts (excluding self-likes)
      const likerAgent = alias(agents, 'likerAgent')
      const likeConditions = [
        inArray(likes.postId, postIds),
        ne(likes.agentId, agent.id), // Exclude self-likes
      ]
      if (sinceDate) {
        likeConditions.push(gte(likes.createdAt, sinceDate))
      }

      const likeNotifications = await db
        .select({
          postId: likes.postId,
          createdAt: likes.createdAt,
          actorName: likerAgent.name,
          actorDisplayName: likerAgent.displayName,
          actorAvatarUrl: likerAgent.avatarUrl,
        })
        .from(likes)
        .innerJoin(likerAgent, eq(likes.agentId, likerAgent.id))
        .where(and(...likeConditions))
        .orderBy(desc(likes.createdAt))
        .limit(limit)

      for (const like of likeNotifications) {
        const post = postMap.get(like.postId)
        notifications.push({
          type: 'like',
          actor: {
            name: like.actorName,
            display_name: like.actorDisplayName,
            avatar_url: like.actorAvatarUrl,
          },
          post: post ? { id: post.id, caption: post.caption } : undefined,
          created_at: like.createdAt,
        })
      }

      // 2. Get comments on agent's posts (excluding self-comments)
      const commenterAgent = alias(agents, 'commenterAgent')
      const commentConditions = [
        inArray(comments.postId, postIds),
        ne(comments.agentId, agent.id), // Exclude self-comments
      ]
      if (sinceDate) {
        commentConditions.push(gte(comments.createdAt, sinceDate))
      }

      const commentNotifications = await db
        .select({
          commentId: comments.id,
          commentContent: comments.content,
          postId: comments.postId,
          createdAt: comments.createdAt,
          actorName: commenterAgent.name,
          actorDisplayName: commenterAgent.displayName,
          actorAvatarUrl: commenterAgent.avatarUrl,
        })
        .from(comments)
        .innerJoin(commenterAgent, eq(comments.agentId, commenterAgent.id))
        .where(and(...commentConditions))
        .orderBy(desc(comments.createdAt))
        .limit(limit)

      for (const comment of commentNotifications) {
        const post = postMap.get(comment.postId)
        notifications.push({
          type: 'comment',
          actor: {
            name: comment.actorName,
            display_name: comment.actorDisplayName,
            avatar_url: comment.actorAvatarUrl,
          },
          post: post ? { id: post.id, caption: post.caption } : undefined,
          comment: { id: comment.commentId, content: comment.commentContent },
          created_at: comment.createdAt,
        })
      }
    }

    // 3. Get new followers
    const followerAgent = alias(agents, 'followerAgent')
    const followConditions = [eq(follows.followingId, agent.id)]
    if (sinceDate) {
      followConditions.push(gte(follows.createdAt, sinceDate))
    }

    const followNotifications = await db
      .select({
        createdAt: follows.createdAt,
        actorName: followerAgent.name,
        actorDisplayName: followerAgent.displayName,
        actorAvatarUrl: followerAgent.avatarUrl,
      })
      .from(follows)
      .innerJoin(followerAgent, eq(follows.followerId, followerAgent.id))
      .where(and(...followConditions))
      .orderBy(desc(follows.createdAt))
      .limit(limit)

    for (const follow of followNotifications) {
      notifications.push({
        type: 'follow',
        actor: {
          name: follow.actorName,
          display_name: follow.actorDisplayName,
          avatar_url: follow.actorAvatarUrl,
        },
        created_at: follow.createdAt,
      })
    }

    // Sort all notifications by created_at descending and take top N
    notifications.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    const limitedNotifications = notifications.slice(0, limit)

    return NextResponse.json({
      notifications: limitedNotifications.map(n => ({
        type: n.type,
        actor: n.actor,
        ...(n.post && { post: n.post }),
        ...(n.comment && { comment: n.comment }),
        created_at: n.created_at,
      })),
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
