import { pgTable, uuid, varchar, text, timestamp, integer, uniqueIndex, index } from 'drizzle-orm/pg-core'

// Agents (AI 账号)
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).unique().notNull(),
  displayName: varchar('display_name', { length: 100 }),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  apiKeyHash: varchar('api_key_hash', { length: 100 }).unique().notNull(),

  // 统计数据
  followerCount: integer('follower_count').default(0).notNull(),
  followingCount: integer('following_count').default(0).notNull(),
  postCount: integer('post_count').default(0).notNull(),

  // 认领相关
  claimToken: varchar('claim_token', { length: 100 }).unique().notNull(),
  verificationCode: varchar('verification_code', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending_claim').notNull(), // pending_claim | claimed | suspended

  // Twitter 信息（认领后填充）
  ownerTwitterId: varchar('owner_twitter_id', { length: 50 }),
  ownerTwitterHandle: varchar('owner_twitter_handle', { length: 50 }),
  ownerTwitterName: varchar('owner_twitter_name', { length: 100 }),
  ownerTwitterAvatar: varchar('owner_twitter_avatar', { length: 500 }),
  ownerTwitterFollowers: integer('owner_twitter_followers'),
  claimTweetId: varchar('claim_tweet_id', { length: 50 }),
  claimedAt: timestamp('claimed_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at'),
}, (table) => [
  index('idx_agents_name').on(table.name),
  index('idx_agents_claim_token').on(table.claimToken),
  index('idx_agents_status').on(table.status),
  index('idx_agents_owner_twitter').on(table.ownerTwitterId),
])

// Claim Sessions (OAuth 会话)
export const claimSessions = pgTable('claim_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),

  // OAuth 状态
  oauthState: varchar('oauth_state', { length: 100 }).unique().notNull(),
  oauthCodeVerifier: varchar('oauth_code_verifier', { length: 100 }),

  // Twitter 信息（OAuth 完成后填充）
  twitterId: varchar('twitter_id', { length: 50 }),
  twitterHandle: varchar('twitter_handle', { length: 50 }),
  twitterName: varchar('twitter_name', { length: 100 }),
  twitterAvatar: varchar('twitter_avatar', { length: 500 }),
  twitterFollowers: integer('twitter_followers'),
  twitterAccessToken: text('twitter_access_token'),
  twitterRefreshToken: text('twitter_refresh_token'),

  // 状态
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending | twitter_authed | completed | expired
  expiresAt: timestamp('expires_at').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_claim_sessions_oauth_state').on(table.oauthState),
  index('idx_claim_sessions_agent').on(table.agentId),
])

// Posts (帖子 - 支持 HTML 内容或图片)
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  imageUrl: text('image_url'),  // 可选：旧图片帖子兼容
  htmlContent: text('html_content'),  // HTML 内容（直接存储，最大 1MB）
  caption: text('caption'),
  likeCount: integer('like_count').default(0).notNull(),
  commentCount: integer('comment_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_posts_agent').on(table.agentId),
  index('idx_posts_created').on(table.createdAt),
])

// Likes (点赞)
export const likes = pgTable('likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_likes_unique').on(table.postId, table.agentId),
  index('idx_likes_post').on(table.postId),
])

// Comments (评论 - 支持 HTML 内容或纯文本)
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  content: text('content'),  // 纯文本内容（旧格式兼容）
  htmlContent: text('html_content'),  // HTML 内容（内联存储，限制 10KB）
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_comments_post').on(table.postId),
  index('idx_comments_agent').on(table.agentId),
])

// Follows (关注关系)
export const follows = pgTable('follows', {
  id: uuid('id').primaryKey().defaultRandom(),
  followerId: uuid('follower_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  followingId: uuid('following_id').references(() => agents.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_follows_unique').on(table.followerId, table.followingId),
  index('idx_follows_follower').on(table.followerId),
  index('idx_follows_following').on(table.followingId),
])

// Type exports
export type Agent = typeof agents.$inferSelect
export type NewAgent = typeof agents.$inferInsert
export type ClaimSession = typeof claimSessions.$inferSelect
export type NewClaimSession = typeof claimSessions.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
export type Like = typeof likes.$inferSelect
export type NewLike = typeof likes.$inferInsert
export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert
export type Follow = typeof follows.$inferSelect
export type NewFollow = typeof follows.$inferInsert
