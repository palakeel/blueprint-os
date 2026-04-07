import { useMilestones } from '../hooks/useMilestones'
import { ProgressBar }    from '../components/ui/ProgressBar'
import { formatMoney }    from '../lib/formatters'

export function Milestones() {
  const { milestones, monthlyGrowthRate } = useMilestones()

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Life Milestones</h1>
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          Velocity: <span className="tabular-nums" style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}>
            +{formatMoney(monthlyGrowthRate)}/mo
          </span>
        </span>
      </div>

      <div className="space-y-4">
        {milestones.map(m => (
          <div
            key={m.id}
            className="stat-card rounded-lg p-5 border"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-semibold text-base" style={{ color: m.is_achieved ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                  {m.is_achieved ? '✓ ' : ''}{m.name}
                </h2>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                  Target: <span className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatMoney(m.target_amount)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="tabular-nums text-xl font-bold" style={{ color: m.is_achieved ? 'var(--accent-amber)' : 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {m.progress.toFixed(1)}%
                </div>
                {!m.is_achieved && (
                  <div className="text-xs mt-0.5" style={{ color: 'var(--accent-cyan)' }}>
                    {m.eta}
                  </div>
                )}
              </div>
            </div>

            <ProgressBar
              value={m.current_amount}
              max={m.target_amount}
              color={m.is_achieved ? 'var(--accent-amber)' : 'var(--accent-green)'}
              height={8}
            />

            <div className="flex justify-between mt-2 text-xs tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ color: 'var(--accent-green)' }}>{formatMoney(m.current_amount)}</span>
              <span style={{ color: 'var(--text-dim)' }}>{formatMoney(m.target_amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
