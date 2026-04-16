import { StatCard } from '../ui/StatCard'
import { AssetDonutChart, DONUT_COLORS } from '../charts/AssetDonutChart'
import { useData } from '../../context/DataContext'
import { formatMoney } from '../../lib/formatters'
import { Private } from '../ui/Private'

export function AssetBreakdown() {
  const { latestNetWorth, portfolio } = useData()

  // Start from the net worth snapshot (for bank/crypto/non-portfolio accounts)
  const raw = { ...(latestNetWorth?.accounts ?? {}) }

  // Override portfolio-backed accounts with live cost-basis from actual positions
  // so adds/sells reflect immediately without waiting for a new net worth entry
  const acctMap = { 'Blueprint': 'Blueprint (Robinhood)', 'Roth IRA': 'Roth IRA', 'Trading': 'Trading Account' }
  for (const [portAcct, snapshotKey] of Object.entries(acctMap)) {
    const val = portfolio
      .filter(p => (p.account ?? 'Blueprint') === portAcct && p.shares > 0)
      .reduce((s, p) => s + p.shares * p.avg_cost, 0)
    if (val > 0) raw[snapshotKey] = val
  }

  const data = Object.entries(raw)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <StatCard title="Asset Breakdown">
      <div className="flex gap-3 items-center">
        <div className="flex-shrink-0">
          <AssetDonutChart data={data} />
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {data.map((item, i) => (
            <div key={item.name} className="flex items-center justify-between gap-1 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                  <Private>{formatMoney(item.value)}</Private>
                </span>
                <span style={{ color: 'var(--text-dim)' }}>
                  {total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StatCard>
  )
}
