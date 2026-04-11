import { StatCard } from '../ui/StatCard'
import { useNetWorth } from '../../hooks/useNetWorth'
import { formatMoneyFull, formatChange, formatPercent } from '../../lib/formatters'
import { useData } from '../../context/DataContext'
import { formatDate } from '../../lib/formatters'
import { Private } from '../ui/Private'

export function NetWorthTicker() {
  const { current, momChange, momPct, dailyVelocity } = useNetWorth()
  const { latestNetWorth } = useData()
  const isPos = momChange >= 0

  return (
    <StatCard title="Net Worth">
      <div className="space-y-2">
        <div
          className="font-bold leading-none tabular-nums"
          style={{ fontSize: '2.2rem', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}
        >
          <Private>{formatMoneyFull(current)}</Private>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="text-sm tabular-nums"
            style={{ color: isPos ? 'var(--accent-green)' : 'var(--accent-red)', fontFamily: "'JetBrains Mono', monospace" }}
          >
            <Private>{formatChange(momChange)} MoM</Private>
          </span>
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            (<Private>{formatPercent(momPct)}</Private>)
          </span>
        </div>

        <div className="text-xs flex items-center gap-1">
          <span style={{ color: 'var(--text-dim)' }}>Velocity:</span>
          <span
            className="tabular-nums"
            style={{ color: dailyVelocity >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontFamily: "'JetBrains Mono', monospace" }}
          >
            <Private>{formatChange(dailyVelocity)}/day</Private>
          </span>
        </div>

        {latestNetWorth?.entry_date && (
          <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
            As of {formatDate(latestNetWorth.entry_date)}
          </div>
        )}
      </div>
    </StatCard>
  )
}
