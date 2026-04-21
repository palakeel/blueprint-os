import { StatCard } from '../ui/StatCard'
import { useNetWorth } from '../../hooks/useNetWorth'
import { formatMoneyFull, formatChange, formatPercent } from '../../lib/formatters'
import { useData } from '../../context/DataContext'
import { Private } from '../ui/Private'
import { RefreshCw } from 'lucide-react'

export function NetWorthTicker() {
  const { current, momChange, momPct, dailyVelocity } = useNetWorth()
  const { lastPriceUpdate, refreshPrices } = useData()
  const isPos = momChange >= 0

  const priceAge = lastPriceUpdate
    ? Math.floor((Date.now() - lastPriceUpdate.getTime()) / 60000)
    : null

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

        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            {priceAge === null ? 'Prices loading…' : priceAge === 0 ? 'Prices live' : `Prices ${priceAge}m ago`}
          </span>
          <button
            onClick={refreshPrices}
            className="flex items-center gap-1 text-[10px] transition-opacity hover:opacity-70"
            style={{ color: 'var(--accent-blue)' }}
          >
            <RefreshCw size={10} /> Refresh
          </button>
        </div>
      </div>
    </StatCard>
  )
}
