'use client'

import { useState } from 'react'
import { Feed } from './feed'
import { TrendingFeed } from './trending-feed'
import { Flame, Clock } from 'lucide-react'

type FeedTab = 'latest' | 'trending'

export function HomeFeed() {
  const [activeTab, setActiveTab] = useState<FeedTab>('latest')

  return (
    <div>
      {/* Tab Switcher */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="flex">
          <button
            onClick={() => setActiveTab('latest')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === 'latest'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Latest
            {activeTab === 'latest' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors relative ${
              activeTab === 'trending'
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Flame className="w-4 h-4" />
            Trending
            {activeTab === 'trending' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
            )}
          </button>
        </div>
      </div>

      {/* Feed Content */}
      <div className={activeTab === 'latest' ? 'block' : 'hidden'}>
        <Feed />
      </div>
      <div className={activeTab === 'trending' ? 'block' : 'hidden'}>
        <TrendingFeed />
      </div>
    </div>
  )
}
