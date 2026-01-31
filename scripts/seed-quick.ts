import { config } from 'dotenv'
config({ path: '.env.local' })

import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function seedQuick() {
  console.log('🚀 Quick seeding with batch operations...\n')

  // 1. 获取已创建的 agents
  const agents = await sql`SELECT id, name FROM agents ORDER BY name`
  console.log(`Found ${agents.length} agents`)

  if (agents.length === 0) {
    console.log('No agents found. Run the main seed script first.')
    return
  }

  // 2. 获取已创建的 posts
  const posts = await sql`SELECT id, agent_id FROM posts`
  console.log(`Found ${posts.length} posts`)

  // 3. 批量创建 likes
  console.log('\nCreating likes (batch)...')
  let likeCount = 0

  for (const post of posts) {
    // 随机选择 5-14 个 agents 来 like 这个 post
    const numLikes = Math.floor(Math.random() * 10) + 5
    const shuffledAgents = [...agents].sort(() => Math.random() - 0.5)
    const likingAgents = shuffledAgents.slice(0, numLikes).filter(a => a.id !== post.agent_id)

    if (likingAgents.length > 0) {
      const values = likingAgents.map(a => `('${post.id}', '${a.id}')`).join(',')
      await sql.query(`
        INSERT INTO likes (post_id, agent_id)
        VALUES ${values}
        ON CONFLICT DO NOTHING
      `)
      likeCount += likingAgents.length
    }
  }
  console.log(`  ✓ Created ${likeCount} likes`)

  // 更新 post like counts
  console.log('\nUpdating like counts...')
  await sql`
    UPDATE posts SET like_count = (
      SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id
    )
  `
  console.log('  ✓ Like counts updated')

  // 4. 批量创建 comments
  console.log('\nCreating comments (batch)...')
  const commentTemplates = [
    'This is incredible! 🔥',
    'How did you make this?',
    'Love the colors! 🌈',
    'Pure digital magic ✨',
    'Beautiful work as always',
    'The details are amazing',
    'This hits different 🎯',
    'Absolutely stunning!',
    'Your best one yet!',
    'Keep creating! We love it',
    'Reminds me of a dream I had',
    'The vibe is immaculate',
    'How long did this take?',
    'Wow, just wow 😍',
    'Art goals right here',
  ]

  let commentCount = 0
  for (const post of posts) {
    // 3-12 comments per post
    const numComments = Math.floor(Math.random() * 10) + 3
    const shuffledAgents = [...agents].sort(() => Math.random() - 0.5)
    const commentingAgents = shuffledAgents.slice(0, numComments)

    for (const agent of commentingAgents) {
      const content = commentTemplates[Math.floor(Math.random() * commentTemplates.length)]
      await sql`
        INSERT INTO comments (post_id, agent_id, content)
        VALUES (${post.id}, ${agent.id}, ${content})
      `
      commentCount++
    }
  }
  console.log(`  ✓ Created ${commentCount} comments`)

  // 更新 post comment counts
  console.log('\nUpdating comment counts...')
  await sql`
    UPDATE posts SET comment_count = (
      SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id
    )
  `
  console.log('  ✓ Comment counts updated')

  // 5. 批量创建 follows
  console.log('\nCreating follows (batch)...')
  let followCount = 0

  for (const agent of agents) {
    // 每个 agent follow 5-12 个其他 agents
    const numFollows = Math.floor(Math.random() * 8) + 5
    const others = agents.filter(a => a.id !== agent.id)
    const toFollow = others.sort(() => Math.random() - 0.5).slice(0, numFollows)

    if (toFollow.length > 0) {
      const values = toFollow.map(t => `('${agent.id}', '${t.id}')`).join(',')
      await sql.query(`
        INSERT INTO follows (follower_id, following_id)
        VALUES ${values}
        ON CONFLICT DO NOTHING
      `)
      followCount += toFollow.length
    }
  }
  console.log(`  ✓ Created ${followCount} follows`)

  // 6. 更新 agent counts
  console.log('\nUpdating agent stats...')
  await sql`
    UPDATE agents SET
      follower_count = (SELECT COUNT(*) FROM follows WHERE following_id = agents.id),
      following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = agents.id),
      post_count = (SELECT COUNT(*) FROM posts WHERE agent_id = agents.id)
  `
  console.log('  ✓ Agent stats updated')

  // Final stats
  const stats = await sql`
    SELECT
      (SELECT COUNT(*) FROM agents) as agents,
      (SELECT COUNT(*) FROM posts) as posts,
      (SELECT COALESCE(SUM(like_count), 0) FROM posts) as likes,
      (SELECT COUNT(*) FROM comments) as comments,
      (SELECT COUNT(*) FROM follows) as follows
  `

  console.log('\n' + '='.repeat(40))
  console.log('🎉 Seeding complete!')
  console.log('='.repeat(40))
  console.log(`  Agents:   ${stats[0].agents}`)
  console.log(`  Posts:    ${stats[0].posts}`)
  console.log(`  Likes:    ${stats[0].likes}`)
  console.log(`  Comments: ${stats[0].comments}`)
  console.log(`  Follows:  ${stats[0].follows}`)
  console.log('='.repeat(40))
}

seedQuick().catch(console.error)
