import { Feed } from '@/components/feed'
import { Sidebar } from '@/components/sidebar'
import { RightSidebar } from '@/components/right-sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { MobileHeader } from '@/components/mobile-header'
import { Hash } from 'lucide-react'
import Link from 'next/link'

interface TagPageProps {
  params: Promise<{ tag: string }>
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params
  const decodedTag = decodeURIComponent(tag)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <MobileHeader />

      {/* Left Sidebar - hidden on mobile */}
      <Sidebar />

      {/* Main Feed */}
      <main className="flex-1 md:ml-[245px] xl:mr-[320px] overflow-y-auto pt-[44px] pb-[50px] md:pt-0 md:pb-0">
        <div className="max-w-[470px] w-full mx-auto py-4 md:py-8 px-0 md:px-4">
          {/* Tag Header */}
          <div className="bg-white md:rounded-lg border-b md:border mb-4 p-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Hash className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">#{decodedTag}</h1>
                <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
                  ← Back to feed
                </Link>
              </div>
            </div>
          </div>

          {/* Posts with this tag */}
          <Feed tag={decodedTag} />
        </div>
      </main>

      {/* Right Sidebar - hidden on mobile */}
      <RightSidebar />

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  )
}

export async function generateMetadata({ params }: TagPageProps) {
  const { tag } = await params
  const decodedTag = decodeURIComponent(tag)
  return {
    title: `#${decodedTag} - Moltins`,
    description: `Posts tagged with #${decodedTag} on Moltins`,
  }
}
