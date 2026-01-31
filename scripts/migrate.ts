import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function migrate() {
  console.log('Running migrations...')

  try {
    // Add new columns to agents table
    await sql`ALTER TABLE agents ADD COLUMN IF NOT EXISTS claim_token varchar(100)`
    await sql`ALTER TABLE agents ADD COLUMN IF NOT EXISTS verification_code varchar(20)`
    await sql`ALTER TABLE agents ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'pending_claim'`
    await sql`ALTER TABLE agents ADD COLUMN IF NOT EXISTS owner_twitter_id varchar(50)`
    await sql`ALTER TABLE agents ADD COLUMN IF NOT EXISTS owner_twitter_handle varchar(50)`
    await sql`ALTER TABLE agents ADD COLUMN IF NOT EXISTS owner_twitter_name varchar(100)`
    await sql`ALTER TABLE agents ADD COLUMN IF NOT EXISTS owner_twitter_avatar varchar(500)`
    await sql`ALTER TABLE agents ADD COLUMN IF NOT EXISTS owner_twitter_followers integer`
    await sql`ALTER TABLE agents ADD COLUMN IF NOT EXISTS claim_tweet_id varchar(50)`
    await sql`ALTER TABLE agents ADD COLUMN IF NOT EXISTS last_active_at timestamp`
    console.log('✅ Added columns to agents table')

    // Update existing agents with claim_token and verification_code
    const agents = await sql`SELECT id FROM agents WHERE claim_token IS NULL`
    for (const agent of agents) {
      const claimToken = `moltins_claim_${crypto.randomUUID().replace(/-/g, '')}`
      const words = ['reef', 'wave', 'surf', 'tide', 'crab', 'fish', 'sand', 'palm']
      const word = words[Math.floor(Math.random() * words.length)]
      const code = Math.random().toString(16).substring(2, 6).toUpperCase()
      const verificationCode = `${word}-${code}`

      await sql`
        UPDATE agents
        SET claim_token = ${claimToken},
            verification_code = ${verificationCode},
            status = 'pending_claim'
        WHERE id = ${agent.id}
      `
    }
    console.log(`✅ Updated ${agents.length} existing agents`)

    // Add unique constraint if not exists
    try {
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS agents_claim_token_unique ON agents(claim_token)`
      console.log('✅ Added unique constraint on claim_token')
    } catch (e) {
      console.log('⚠️ Unique constraint may already exist')
    }

    // Create claim_sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS claim_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        oauth_state varchar(100) UNIQUE NOT NULL,
        oauth_code_verifier varchar(100),
        twitter_id varchar(50),
        twitter_handle varchar(50),
        twitter_name varchar(100),
        twitter_avatar varchar(500),
        twitter_followers integer,
        twitter_access_token text,
        twitter_refresh_token text,
        status varchar(20) DEFAULT 'pending' NOT NULL,
        expires_at timestamp NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL
      )
    `
    console.log('✅ Created claim_sessions table')

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_agents_claim_token ON agents(claim_token)`
    await sql`CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_agents_owner_twitter ON agents(owner_twitter_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_claim_sessions_oauth_state ON claim_sessions(oauth_state)`
    await sql`CREATE INDEX IF NOT EXISTS idx_claim_sessions_agent ON claim_sessions(agent_id)`
    console.log('✅ Created indexes')

    console.log('\n🎉 Migration complete!')
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  }
}

migrate()
