export function AllocationChart({ portfolio, prices = {} }) {
  const total = portfolio.reduce((s, p) => {
    const price = prices[p.ticker]?.price ?? p.avg_cost
    return s + p.shares * price
  }, 0)

  const rows = portfolio
    .filter(p => (p.target_allocation ?? 0) > 0)
    .map(p => {
      const price   = prices[p.ticker]?.price ?? p.avg_cost
      const value   = p.shares * price
      const current = total > 0 ? (value / total) * 100 : 0
      const target  = p.target_allocation ?? 0
      const diff    = current - target
      const color   = Math.abs(diff) <= 3 ? 'var(--accent-green)'
                    : Math.abs(diff) <= 8 ? 'var(--accent-amber)'
                    : 'var(--accent-red)'
      return { ticker: p.ticker, current, target, diff, color }
    })
    .sort((a, b) => b.target - a.target)

  const maxVal = Math.max(...rows.map(r => Math.max(r.current, r.target)), 1)

  return (
    <div className="space-y-2.5">
      {rows.map(r => (
        <div key={r.ticker} className="flex items-center gap-3">
          {/* Ticker */}
          <div className="w-12 text-xs text-right flex-shrink-0 tabular-nums font-bold"
            style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}>
            {r.ticker}
          </div>

          {/* Bar track */}
          <div className="relative flex-1 h-4 rounded-sm overflow-visible"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}>

            {/* Current allocation bar */}
            <div className="absolute left-0 top-0 h-full rounded-sm transition-all duration-500"
              style={{
                width: `${Math.min((r.current / maxVal) * 100, 100)}%`,
                backgroundColor: r.color,
                opacity: 0.85,
              }}
            />

            {/* Target marker line */}
            <div className="absolute top-0 h-full w-0.5 -translate-x-px"
              style={{
                left: `${Math.min((r.target / maxVal) * 100, 100)}%`,
                backgroundColor: 'var(--text-dim)',
              }}
            />
          </div>

          {/* Values */}
          <div className="w-24 flex-shrink-0 text-right">
            <span className="tabular-nums text-xs font-semibold"
              style={{ color: r.color, fontFamily: "'JetBrains Mono', monospace" }}>
              {r.current.toFixed(1)}%
            </span>
            <span className="tabular-nums text-xs ml-1"
              style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
              / {r.target}%
            </span>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-4 pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-2.5 rounded-sm" style={{ backgroundColor: 'var(--accent-green)', opacity: 0.85 }} />
          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-3" style={{ backgroundColor: 'var(--text-dim)' }} />
          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Target</span>
        </div>
        <div className="flex items-center gap-3 ml-auto text-[10px]" style={{ color: 'var(--text-dim)' }}>
          <span style={{ color: 'var(--accent-green)' }}>● ≤3%</span>
          <span style={{ color: 'var(--accent-amber)' }}>● ≤8%</span>
          <span style={{ color: 'var(--accent-red)' }}>● &gt;8%</span>
        </div>
      </div>
    </div>
  )
}
