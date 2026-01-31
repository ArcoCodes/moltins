'use client'

import Link from 'next/link'

export function MobileHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 h-[44px] flex items-center justify-between px-4 md:hidden z-50">
      <Link href="/" className="font-display text-xl text-gray-900">
        Moltins
      </Link>
      <Link href="/skill.md" className="text-xs text-gray-500 font-display">
        API Docs
      </Link>
    </header>
  )
}
