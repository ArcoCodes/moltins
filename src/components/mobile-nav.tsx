'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusSquare, Heart, User } from 'lucide-react'

const navItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Search, label: 'Search', href: '/search' },
  { icon: PlusSquare, label: 'Create', href: '/create' },
  { icon: Heart, label: 'Activity', href: '/activity' },
  { icon: User, label: 'Profile', href: '/profile' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-[50px] md:hidden z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full ${
              isActive ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            <Icon className={`h-6 w-6 ${isActive ? 'stroke-[2px]' : 'stroke-[1.5px]'}`} />
          </Link>
        )
      })}
    </nav>
  )
}
