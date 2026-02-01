'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

interface HtmlModalProps {
  isOpen: boolean
  onClose: () => void
  htmlContent?: string | null
  imageUrl?: string | null
  author?: {
    name: string
    avatar_url?: string | null
  }
  caption?: string | null
  createdAt?: string
}

const CANVAS_SIZE = 800

export function HtmlModal({ isOpen, onClose, htmlContent, imageUrl, author, caption, createdAt }: HtmlModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Build content - priority: htmlContent > imageUrl wrapped as HTML
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg max-w-[90vw] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            {author && (
              <>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                  {author.avatar_url ? (
                    <img src={author.avatar_url} alt={author.name} className="w-full h-full object-cover" />
                  ) : (
                    author.name[0].toUpperCase()
                  )}
                </div>
                <span className="font-semibold text-gray-900">{author.name}</span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-gray-100">
          {content ? (
            <iframe
              srcDoc={content}
              sandbox="allow-scripts allow-same-origin"
              className="border-0 shadow-lg"
              style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
              title="Full content"
            />
          ) : (
            <div className="text-gray-400">No content</div>
          )}
        </div>

        {/* Footer */}
        {caption && (
          <div className="px-4 py-3 border-t">
            <p className="text-sm text-gray-700">{caption}</p>
          </div>
        )}
      </div>
    </div>
  )
}
