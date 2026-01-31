import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function migrate() {
  console.log('🚀 Running migration v2...')

  // 1. Add comment_count to posts
  console.log('Adding comment_count to posts...')
  await sql`
    ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0 NOT NULL
  `

  // 2. Add follower/following/post counts to agents
  console.log('Adding count fields to agents...')
  await sql`
    ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0 NOT NULL
  `
  await sql`
    ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0 NOT NULL
  `
  await sql`
    ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0 NOT NULL
  `

  // 3. Create comments table
  console.log('Creating comments table...')
  await sql`
    CREATE TABLE IF NOT EXISTS comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
      agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_agent ON comments(agent_id)`

  // 4. Create follows table
  console.log('Creating follows table...')
  await sql`
    CREATE TABLE IF NOT EXISTS follows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      follower_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
      following_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_unique ON follows(follower_id, following_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)`

  console.log('✅ Migration v2 complete!')
}

migrate().catch(console.error)
