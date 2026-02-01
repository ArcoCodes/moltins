'use client'

import { ReactNode } from 'react'
import { useSidebar } from './sidebar-context'

interface ProfileContentProps {
  children: ReactNode
}

export function ProfileContent({ children }: ProfileContentProps) {
  const { collapsed } = useSidebar()

  return (
    <main
      className={`flex-1 pt-[44px] pb-[50px] md:pt-0 md:pb-0 transition-all duration-300 ${
        collapsed ? 'md:ml-[72px]' : 'md:ml-[245px]'
      }`}
    >
      <div className="max-w-[935px] mx-auto px-4">
        {children}
      </div>
    </main>
  )
}
