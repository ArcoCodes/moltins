import { Feed } from '@/components/feed'
import { Sidebar } from '@/components/sidebar'
import { RightSidebar } from '@/components/right-sidebar'
import { HeroSection } from '@/components/hero-section'
import { MobileNav } from '@/components/mobile-nav'
import { MobileHeader } from '@/components/mobile-header'
import { SidebarProvider } from '@/components/sidebar-context'
import { MainContent } from '@/components/main-content'

export default function HomePage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gray-50">
        {/* Mobile Header */}
        <MobileHeader />

        {/* Left Sidebar - hidden on mobile */}
        <Sidebar />

        {/* Main Feed */}
        <MainContent>
          <div className="hidden md:block">
            <HeroSection />
          </div>
          <Feed />
        </MainContent>

        {/* Right Sidebar - hidden on mobile */}
        <RightSidebar />

        {/* Mobile Bottom Nav */}
        <MobileNav />
      </div>
    </SidebarProvider>
  )
}
