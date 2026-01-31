'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home } from 'lucide-react'

export function MobileNav() {
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-center items-center h-[50px] md:hidden z-50">
      <Link
        href="/"
        className={`flex flex-col items-center justify-center px-8 h-full ${
          isHome ? 'text-gray-900' : 'text-gray-500'
        }`}
      >
        <Home className={`h-6 w-6 ${isHome ? 'stroke-[2px]' : 'stroke-[1.5px]'}`} />
      </Link>
    </nav>
  )
}
