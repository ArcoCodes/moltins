import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { nanoid } from 'nanoid'

// 检查必要的环境变量
const checkEnvVars = () => {
  const required = ['R2_ENDPOINT', 'R2_ACCESS_KEY', 'R2_SECRET_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL']
  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    console.error('Missing R2 environment variables:', missing)
  }
  return missing.length === 0
}

// R2 客户端（延迟初始化）
let r2Client: S3Client | null = null

function getR2Client(): S3Client {
  if (!r2Client) {
    if (!checkEnvVars()) {
      throw new Error('R2 configuration incomplete - missing environment variables')
    }
    // Trim credentials to remove any accidental whitespace/newlines
    const accessKey = process.env.R2_ACCESS_KEY!.trim()
    const secretKey = process.env.R2_SECRET_KEY!.trim()
    const endpoint = process.env.R2_ENDPOINT!.trim()

    r2Client = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    })
  }
  return r2Client
}

// 从 URL 下载图片并上传到 R2
export async function downloadAndStore(imageUrl: string): Promise<string> {
  console.log('downloadAndStore: Starting for URL:', imageUrl)

  // 1. 下载图片
  let response: Response
  try {
    response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Moltins/1.0' },
      redirect: 'follow'
    })
  } catch (fetchError) {
    console.error('downloadAndStore: Fetch failed:', fetchError)
    throw new Error(`Failed to fetch image: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
  }

  if (!response.ok) {
    console.error('downloadAndStore: Fetch returned non-OK status:', response.status)
    throw new Error(`Failed to download image: ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg'
  console.log('downloadAndStore: Content-Type:', contentType)

  const buffer = await response.arrayBuffer()
  console.log('downloadAndStore: Downloaded size:', buffer.byteLength)

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
  console.log('downloadAndStore: Uploading to key:', key)

  // 3. 上传到 R2
  try {
    const r2 = getR2Client()
    const bucket = process.env.R2_BUCKET!.trim()
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(buffer),
      ContentType: contentType,
    })
    await r2.send(command)
    console.log('downloadAndStore: Upload successful')
  } catch (uploadError) {
    console.error('downloadAndStore: R2 upload failed:', uploadError)
    throw new Error(`Failed to upload to R2: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`)
  }

  // 4. 返回永久 URL
  const publicUrl = `${process.env.R2_PUBLIC_URL!.trim()}/${key}`
  console.log('downloadAndStore: Returning URL:', publicUrl)
  return publicUrl
}

// 删除文件
export async function deleteFile(key: string): Promise<void> {
  const r2 = getR2Client()
  const bucket = process.env.R2_BUCKET!.trim()
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  await r2.send(command)
}

// 从 URL 提取 key
export function extractKeyFromUrl(url: string): string | null {
  const publicUrl = process.env.R2_PUBLIC_URL?.trim()
  if (!publicUrl || !url.startsWith(publicUrl)) {
    return null
  }
  return url.slice(publicUrl.length + 1)
}
