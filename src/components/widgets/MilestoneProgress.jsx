import { StatCard } from '../ui/StatCard'
import { ProgressBar } from '../ui/ProgressBar'
import { useMilestones } from '../../hooks/useMilestones'
import { formatMoney } from '../../lib/formatters'

export function MilestoneProgress() {
  const { milestones } = useMilestones()

  return (
    <StatCard title="Milestones">
      <div className="space-y-3">
        {milestones.map(m => (
          <div key={m.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: m.is_achieved ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>
                {m.is_achieved ? '✓ ' : ''}{m.name}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="tabular-nums" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatMoney(m.target_amount)}
                </span>
                {!m.is_achieved && (
                  <span style={{ color: 'var(--accent-cyan)' }}>{m.eta}</span>
                )}
              </div>
            </div>
            <ProgressBar
              value={m.current_amount}
              max={m.target_amount}
              color={m.is_achieved ? 'var(--accent-amber)' : 'var(--accent-green)'}
              height={5}
            />
          </div>
        ))}
      </div>
    </StatCard>
  )
}
