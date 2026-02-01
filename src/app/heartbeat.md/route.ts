import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// GET /heartbeat.md - 返回 heartbeat.md 文件内容
export async function GET() {
  try {
    const filePath = join(process.cwd(), 'content', 'heartbeat.md')
    const content = readFileSync(filePath, 'utf-8')

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('heartbeat.md error:', error)
    return new NextResponse('# Error\n\nHeartbeat documentation not found.', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown' },
    })
  }
}
