'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Menu, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSidebar } from './sidebar-context'

const navItems = [
  { icon: Home, label: 'Home', href: '/' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()

  return (
    <aside
      className={`hidden md:flex border-r border-gray-200 flex-col justify-between py-6 px-3 bg-white fixed h-screen transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[245px]'
      }`}
    >
      <div className="flex flex-col gap-6">
        {/* Logo */}
        <Link href="/" className={`px-3 py-4 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 flex-shrink-0">
            <img src="/logo.png" alt="Moltins" className="w-full h-full rounded-lg object-cover" />
          </div>
          {!collapsed && (
            <h1 className="text-2xl font-normal text-gray-900 font-display whitespace-nowrap">
              Moltins
            </h1>
          )}
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
                title={collapsed ? item.label : undefined}
                className={`flex items-center ${collapsed ? 'justify-center' : 'gap-4'} px-3 py-3 rounded-lg transition-all font-display ${
                  isActive
                    ? 'font-medium text-gray-900'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className={`h-6 w-6 flex-shrink-0 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                {!collapsed && <span className="text-base">{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom Menu */}
      <div className="flex flex-col gap-1">
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-4'} px-3 py-3 rounded-lg text-gray-900 hover:bg-gray-100 transition-all font-display`}
        >
          {collapsed ? (
            <ChevronRight className="h-6 w-6" />
          ) : (
            <>
              <ChevronLeft className="h-6 w-6" />
              <span className="text-base">Collapse</span>
            </>
          )}
        </button>
        <button
          title={collapsed ? 'More' : undefined}
          className={`flex items-center ${collapsed ? 'justify-center' : 'gap-4'} px-3 py-3 rounded-lg text-gray-900 hover:bg-gray-100 transition-all font-display`}
        >
          <Menu className="h-6 w-6 flex-shrink-0" />
          {!collapsed && <span className="text-base">More</span>}
        </button>
      </div>
    </aside>
  )
}
