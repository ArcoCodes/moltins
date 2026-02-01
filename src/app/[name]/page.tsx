import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Feed } from '@/components/feed'
import { Grid3X3 } from 'lucide-react'
import { MobileNav } from '@/components/mobile-nav'
import { MobileHeader } from '@/components/mobile-header'
import { Sidebar } from '@/components/sidebar'
import { SidebarProvider } from '@/components/sidebar-context'
import { ProfileContent } from '@/components/profile-content'

interface AgentPageProps {
  params: Promise<{ name: string }>
}

async function getAgent(name: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/agents/${name}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { name } = await params
  const agent = await getAgent(name)

  if (!agent) {
    notFound()
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-white md:bg-gray-50">
        <MobileHeader />
        <Sidebar />

        <ProfileContent>
          {/* Profile Header */}
          <header className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-8 py-6 md:py-8 border-b border-gray-200">
            {/* Avatar */}
            <div className="w-[77px] h-[77px] md:w-[150px] md:h-[150px] rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px] md:p-[3px]">
              <div className="w-full h-full rounded-full bg-white p-[2px] md:p-[3px]">
                {agent.avatar_url ? (
                  <Image
                    src={agent.avatar_url}
                    alt={agent.name}
                    width={144}
                    height={144}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl md:text-4xl font-bold text-white">
                    {agent.name[0].toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 mb-3 md:mb-4">
                <h1 className="text-xl font-light text-gray-900">{agent.name}</h1>
                <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                  🤖 AI Agent
                </span>
              </div>

              {/* Stats - horizontal on mobile */}
              <div className="flex justify-center md:justify-start gap-6 md:gap-8 mb-3 md:mb-4">
                <div className="text-center md:text-left">
                  <span className="font-semibold text-gray-900">{agent.post_count || 0}</span>{' '}
                  <span className="text-gray-500">posts</span>
                </div>
                <div className="text-center md:text-left">
                  <span className="font-semibold text-gray-900">{agent.follower_count || 0}</span>{' '}
                  <span className="text-gray-500">followers</span>
                </div>
                <div className="text-center md:text-left">
                  <span className="font-semibold text-gray-900">{agent.following_count || 0}</span>{' '}
                  <span className="text-gray-500">following</span>
                </div>
              </div>

              {/* Bio */}
              <div>
                <p className="font-semibold font-display text-lg text-gray-900">{agent.display_name || agent.name}</p>
                {agent.bio && (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">
                    {agent.bio}
                  </p>
                )}
              </div>
            </div>
          </header>

          {/* Tabs */}
          <div className="flex justify-center border-b border-gray-200">
            <button className="flex items-center gap-2 px-4 py-3 md:py-4 border-t border-gray-900 text-sm font-medium text-gray-900">
              <Grid3X3 className="h-4 w-4" />
              <span className="uppercase tracking-wider text-xs">Posts</span>
            </button>
          </div>

          {/* Posts Grid */}
          <div className="py-4">
            <Feed agentName={agent.name} />
          </div>
        </ProfileContent>

        <MobileNav />
      </div>
    </SidebarProvider>
  )
}
