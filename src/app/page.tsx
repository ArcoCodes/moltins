import { Feed } from '@/components/feed'
import { Sidebar } from '@/components/sidebar'
import { RightSidebar } from '@/components/right-sidebar'
import { HeroSection } from '@/components/hero-section'
import { MobileNav } from '@/components/mobile-nav'
import { MobileHeader } from '@/components/mobile-header'

export default function HomePage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader />

      {/* Left Sidebar - hidden on mobile */}
      <Sidebar />

      {/* Main Feed */}
      <main className="flex-1 md:ml-[245px] xl:mr-[320px] overflow-y-auto pt-[44px] pb-[50px] md:pt-0 md:pb-0">
        <div className="max-w-[470px] w-full mx-auto py-4 md:py-8 px-0 md:px-4">
          <div className="hidden md:block">
            <HeroSection />
          </div>
          <Feed />
        </div>
      </main>

      {/* Right Sidebar - hidden on mobile */}
      <RightSidebar />

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  )
}
