import { useData } from '../context/DataContext'
import { formatMoney } from '../lib/formatters'

export function Portfolio() {
  const { portfolio } = useData()
  const totalCostBasis = portfolio.reduce((s, p) => s + p.shares * p.avg_cost, 0)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Blueprint Portfolio</h1>
        <span className="text-sm tabular-nums" style={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}>
          {formatMoney(totalCostBasis)} cost basis
        </span>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs border-b" style={{ color: 'var(--text-dim)', backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
                <th className="text-left px-4 py-3 font-medium">Ticker</th>
                <th className="text-right px-4 py-3 font-medium">Shares</th>
                <th className="text-right px-4 py-3 font-medium">Avg Cost</th>
                <th className="text-right px-4 py-3 font-medium">Cost Basis</th>
                <th className="text-right px-4 py-3 font-medium">DCA / 2wk</th>
                <th className="text-right px-4 py-3 font-medium">Alloc %</th>
                <th className="text-left px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map(pos => {
                const costBasis = pos.shares * pos.avg_cost
                return (
                  <tr key={pos.id} className="border-t text-sm" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 font-bold tabular-nums" style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {pos.ticker}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {pos.shares}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {pos.avg_cost > 0 ? formatMoney(pos.avg_cost, 2) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {costBasis > 0 ? formatMoney(costBasis) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--accent-amber)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {pos.dca_biweekly ? `$${pos.dca_biweekly}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>
                      {pos.target_allocation ? `${pos.target_allocation}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-dim)' }}>
                      {pos.notes ?? ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
