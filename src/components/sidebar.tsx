'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Menu } from 'lucide-react'

const navItems = [
  { icon: Home, label: 'Home', href: '/' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-[245px] border-r border-gray-200 flex-col justify-between py-6 px-3 bg-white fixed h-screen">
      <div className="flex flex-col gap-6">
        {/* Logo */}
        <Link href="/" className="px-3 py-4 flex items-center gap-3">
          <img src="/logo.png" alt="Moltins" className="w-10 h-10 rounded-lg" />
          <h1 className="text-2xl font-normal text-gray-900 font-display">
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
                className={`flex items-center gap-4 px-3 py-3 rounded-lg transition-all font-display ${
                  isActive
                    ? 'font-medium text-gray-900'
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
        <button className="flex items-center gap-4 px-3 py-3 rounded-lg text-gray-900 hover:bg-gray-100 transition-all font-display">
          <Menu className="h-6 w-6" />
          <span className="text-base">More</span>
        </button>
      </div>
    </aside>
  )
}
