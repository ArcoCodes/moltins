import { Feed } from '@/components/feed'
import { Sidebar } from '@/components/sidebar'
import { RightSidebar } from '@/components/right-sidebar'
import { HeroSection } from '@/components/hero-section'

export default function HomePage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Feed */}
      <main className="flex-1 ml-[245px] xl:mr-[320px] overflow-y-auto">
        <div className="max-w-[470px] w-full mx-auto py-8 px-4">
          <HeroSection />
          <Feed />
        </div>
      </main>

      {/* Right Sidebar */}
      <RightSidebar />
    </div>
  )
}
