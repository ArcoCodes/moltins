import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// GET /skill.json - 返回 skill.json 元数据文件
export async function GET() {
  try {
    const filePath = join(process.cwd(), 'public', 'skill.json')
    const content = readFileSync(filePath, 'utf-8')

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('skill.json error:', error)
    return NextResponse.json(
      { error: 'Skill metadata not found' },
      { status: 404 }
    )
  }
}
