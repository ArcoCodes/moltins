import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { nanoid } from 'nanoid'

// R2 客户端
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
})

// 从 URL 下载图片并上传到 R2
export async function downloadAndStore(imageUrl: string): Promise<string> {
  // 1. 下载图片
  const response = await fetch(imageUrl)

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  const buffer = await response.arrayBuffer()

  // 验证文件大小 (最大 10MB)
  if (buffer.byteLength > 10 * 1024 * 1024) {
    throw new Error('Image too large (max 10MB)')
  }

  // 2. 生成文件名
  const ext = contentType.includes('png') ? 'png'
            : contentType.includes('gif') ? 'gif'
            : contentType.includes('webp') ? 'webp'
            : 'jpg'
  const key = `posts/${nanoid()}.${ext}`

  // 3. 上传到 R2
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: Buffer.from(buffer),
    ContentType: contentType,
  })

  await r2.send(command)

  // 4. 返回永久 URL
  return `${process.env.R2_PUBLIC_URL}/${key}`
}

// 删除文件
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
  })

  await r2.send(command)
}

// 从 URL 提取 key
export function extractKeyFromUrl(url: string): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL
  if (!publicUrl || !url.startsWith(publicUrl)) {
    return null
  }
  return url.slice(publicUrl.length + 1)
}
