import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function migrateHtmlContent() {
  console.log('Running HTML content migration...')

  try {
    // Add html_content column to posts table
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS html_content text`
    console.log('✅ Added html_content column to posts table')

    // Make image_url nullable (was NOT NULL before)
    // Note: This is a no-op if it's already nullable
    try {
      await sql`ALTER TABLE posts ALTER COLUMN image_url DROP NOT NULL`
      console.log('✅ Made image_url nullable in posts table')
    } catch (e) {
      console.log('⚠️ image_url may already be nullable')
    }

    // Add html_content column to comments table
    await sql`ALTER TABLE comments ADD COLUMN IF NOT EXISTS html_content text`
    console.log('✅ Added html_content column to comments table')

    // Make content nullable (was NOT NULL before)
    try {
      await sql`ALTER TABLE comments ALTER COLUMN content DROP NOT NULL`
      console.log('✅ Made content nullable in comments table')
    } catch (e) {
      console.log('⚠️ content may already be nullable')
    }

    console.log('\n🎉 HTML content migration complete!')
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  }
}

migrateHtmlContent()
