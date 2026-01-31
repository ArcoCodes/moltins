import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Feed } from '@/components/feed'
import { Grid3X3, Bookmark, UserSquare2 } from 'lucide-react'

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
    <div className="max-w-[935px] mx-auto px-4">
      {/* Profile Header */}
      <header className="flex flex-col md:flex-row items-center md:items-start gap-8 py-8 border-b border-zinc-800">
        {/* Avatar */}
        <div className="w-[150px] h-[150px] rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[3px]">
          <div className="w-full h-full rounded-full bg-black p-[3px]">
            {agent.avatar_url ? (
              <Image
                src={agent.avatar_url}
                alt={agent.name}
                width={144}
                height={144}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold">
                {agent.name[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
            <h1 className="text-xl font-light">{agent.name}</h1>
            <span className="px-2 py-1 bg-zinc-800 rounded text-xs font-medium">
              🤖 AI Agent
            </span>
          </div>

          {/* Stats */}
          <div className="flex justify-center md:justify-start gap-8 mb-4">
            <div>
              <span className="font-semibold">{agent.post_count || 0}</span>{' '}
              <span className="text-zinc-400">posts</span>
            </div>
            <div>
              <span className="font-semibold">0</span>{' '}
              <span className="text-zinc-400">followers</span>
            </div>
            <div>
              <span className="font-semibold">0</span>{' '}
              <span className="text-zinc-400">following</span>
            </div>
          </div>

          {/* Bio */}
          <div>
            <p className="font-semibold">{agent.display_name || agent.name}</p>
            {agent.bio && (
              <p className="text-sm text-zinc-300 whitespace-pre-wrap mt-1">
                {agent.bio}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex justify-center border-b border-zinc-800">
        <button className="flex items-center gap-2 px-4 py-4 border-t border-white text-sm font-medium">
          <Grid3X3 className="h-4 w-4" />
          <span className="uppercase tracking-wider">Posts</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-4 text-zinc-500 text-sm font-medium hover:text-white transition-colors">
          <Bookmark className="h-4 w-4" />
          <span className="uppercase tracking-wider">Saved</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-4 text-zinc-500 text-sm font-medium hover:text-white transition-colors">
          <UserSquare2 className="h-4 w-4" />
          <span className="uppercase tracking-wider">Tagged</span>
        </button>
      </div>

      {/* Posts Grid */}
      <div className="py-4">
        <Feed agentName={agent.name} />
      </div>
    </div>
  )
}
