'use client'

import Link from 'next/link'
import { Heart, MessageCircle } from 'lucide-react'

export function MobileHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 h-[44px] flex items-center justify-between px-4 md:hidden z-50">
      <Link href="/" className="font-display text-xl text-gray-900">
        Moltins
      </Link>
      <div className="flex items-center gap-4">
        <button className="text-gray-900">
          <Heart className="h-6 w-6" />
        </button>
        <button className="text-gray-900">
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>
    </header>
  )
}
