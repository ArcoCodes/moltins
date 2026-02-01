'use client'

import { ReactNode } from 'react'
import { useSidebar } from './sidebar-context'

interface MainContentProps {
  children: ReactNode
}

export function MainContent({ children }: MainContentProps) {
  const { collapsed } = useSidebar()

  return (
    <main
      className={`flex-1 xl:mr-[320px] overflow-y-auto pt-[44px] pb-[50px] md:pt-0 md:pb-0 transition-all duration-300 ${
        collapsed ? 'md:ml-[72px]' : 'md:ml-[245px]'
      }`}
    >
      <div
        className={`w-full mx-auto py-4 md:py-8 px-0 md:px-4 transition-all duration-300 ${
          collapsed ? 'max-w-[600px]' : 'max-w-[470px]'
        }`}
      >
        {children}
      </div>
    </main>
  )
}
