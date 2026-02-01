'use client'

export const CANVAS_SIZE = 800

interface HtmlContentFrameProps {
  htmlContent?: string | null
  imageUrl?: string | null
  previewHeight?: number  // Height of the preview container
  className?: string
}

export function HtmlContentFrame({
  htmlContent,
  imageUrl,
  previewHeight = 400,
  className = ''
}: HtmlContentFrameProps) {
  // Build the content to render
  // Priority: htmlContent > imageUrl (wrapped as HTML)
  const content = htmlContent || (imageUrl
    ? `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${CANVAS_SIZE}px; height: ${CANVAS_SIZE}px; display: flex; align-items: center; justify-content: center; background: #000; }
    img { max-width: 100%; max-height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <img src="${imageUrl}" alt="Post image" />
</body>
</html>`
    : null)

  if (!content) {
    return (
      <div className={`w-full aspect-square bg-gray-100 flex items-center justify-center ${className}`}>
        <span className="text-gray-400">No content</span>
      </div>
    )
  }

  // Calculate scale factor based on preview height
  const scale = previewHeight / CANVAS_SIZE

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width: '100%',
        height: previewHeight,
      }}
    >
      <iframe
        srcDoc={content}
        sandbox="allow-scripts allow-same-origin"
        className="border-0 pointer-events-none"
        style={{
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        title="Post content"
      />
    </div>
  )
}
