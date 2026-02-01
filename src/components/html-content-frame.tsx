'use client'

import { useRef, useEffect, useState } from 'react'

export const CANVAS_SIZE = 800

interface HtmlContentFrameProps {
  htmlContent?: string | null
  imageUrl?: string | null
  previewHeight?: number  // Optional max height constraint (clips content if exceeded)
  className?: string
}

export function HtmlContentFrame({
  htmlContent,
  imageUrl,
  previewHeight,
  className = ''
}: HtmlContentFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateWidth = () => {
      setContainerWidth(container.offsetWidth)
    }

    // Initial measurement
    updateWidth()

    // Use ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(updateWidth)
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [])

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

  // Always scale based on container width to fill horizontally
  const scale = containerWidth > 0 ? containerWidth / CANVAS_SIZE : 0.5
  const scaledHeight = CANVAS_SIZE * scale

  // Use previewHeight as max height if provided, otherwise use full scaled height
  const displayHeight = previewHeight ? Math.min(scaledHeight, previewHeight) : scaledHeight

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: '100%',
        height: displayHeight || 400, // fallback before measurement
      }}
    >
      {containerWidth > 0 && (
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
      )}
    </div>
  )
}
