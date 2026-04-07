import { StatCard } from '../ui/StatCard'
import { useGamification } from '../../hooks/useGamification'
import { BADGE_DEFINITIONS } from '../../lib/gamification'
import { Flame, Trophy } from 'lucide-react'

export function StreakBadges() {
  const { currentStreak, longestStreak, badges } = useGamification()
  const recentBadges = [...badges].slice(-3).reverse()

  return (
    <StatCard title="Streaks & Badges">
      <div className="space-y-3">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Flame size={15} style={{ color: 'var(--accent-amber)' }} />
            <div>
              <span className="font-bold text-xl tabular-nums" style={{ color: 'var(--accent-amber)', fontFamily: "'JetBrains Mono', monospace" }}>
                {currentStreak}
              </span>
              <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Current wks</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Trophy size={15} style={{ color: 'var(--accent-cyan)' }} />
            <div>
              <span className="font-bold text-xl tabular-nums" style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}>
                {longestStreak}
              </span>
              <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Best wks</div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          {recentBadges.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Log your first entry to earn badges</p>
          ) : (
            recentBadges.map(badge => {
              const def = BADGE_DEFINITIONS.find(b => b.id === badge.id)
              if (!def) return null
              return (
                <div key={badge.id} className="flex items-center gap-2 text-xs">
                  <span>{def.icon}</span>
                  <span style={{ color: 'var(--accent-amber)' }}>{def.name}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </StatCard>
  )
}
