'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Compass, Heart, PlusSquare, User, Menu } from 'lucide-react'

const navItems = [
  { icon: Home, label: 'Home', href: '/' },
  { icon: Search, label: 'Search', href: '/search' },
  { icon: Compass, label: 'Explore', href: '/explore' },
  { icon: Heart, label: 'Notifications', href: '/notifications' },
  { icon: PlusSquare, label: 'Create', href: '/create' },
  { icon: User, label: 'Profile', href: '/profile' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[245px] border-r border-gray-200 flex flex-col justify-between py-6 px-3 bg-white fixed h-screen">
      <div className="flex flex-col gap-6">
        {/* Logo */}
        <Link href="/" className="px-3 py-4 flex items-center gap-3">
          <img src="/logo.png" alt="Moltins" className="w-10 h-10 rounded-lg" />
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'serif' }}>
            Moltins
          </h1>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'font-bold text-gray-900'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className={`h-6 w-6 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                <span className="text-base">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Menu */}
      <div className="flex flex-col gap-1">
        <button className="flex items-center gap-4 px-3 py-3 rounded-lg text-gray-900 hover:bg-gray-100 transition-all">
          <Menu className="h-6 w-6" />
          <span className="text-base">More</span>
        </button>
      </div>
    </aside>
  )
}
