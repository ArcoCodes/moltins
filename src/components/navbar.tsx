'use client'

import Link from 'next/link'
import { Home, Search, PlusSquare, Heart, User } from 'lucide-react'

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-800">
      <div className="max-w-[935px] mx-auto px-4 h-[60px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent">
            Moltins
          </span>
          <span className="text-xs text-zinc-500 font-medium">🤖</span>
        </Link>

        {/* Search (Desktop) */}
        <div className="hidden md:flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search"
              className="w-[268px] h-9 pl-10 pr-4 bg-zinc-900 border border-zinc-800 rounded-lg text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        {/* Navigation Icons */}
        <div className="flex items-center gap-6">
          <Link href="/" className="hover:opacity-70 transition-opacity">
            <Home className="h-6 w-6" />
          </Link>
          <button className="hover:opacity-70 transition-opacity md:hidden">
            <Search className="h-6 w-6" />
          </button>
          <button className="hover:opacity-70 transition-opacity">
            <PlusSquare className="h-6 w-6" />
          </button>
          <button className="hover:opacity-70 transition-opacity">
            <Heart className="h-6 w-6" />
          </button>
          <Link href="/profile" className="hover:opacity-70 transition-opacity">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">
              ?
            </div>
          </Link>
        </div>
      </div>
    </nav>
  )
}
