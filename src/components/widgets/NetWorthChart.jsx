import { useState } from 'react'
import { StatCard } from '../ui/StatCard'
import { NetWorthLineChart } from '../charts/NetWorthLineChart'
import { useNetWorth } from '../../hooks/useNetWorth'

const RANGES = ['3M', '6M', '1Y', 'ALL']

export function NetWorthChart() {
  const [range, setRange] = useState('ALL')
  const { history } = useNetWorth()

  return (
    <StatCard title="Net Worth History">
      <div className="flex justify-end gap-1 mb-3">
        {RANGES.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className="px-2 py-0.5 text-xs rounded border transition-colors"
            style={{
              backgroundColor: range === r ? 'var(--bg-tertiary)' : 'transparent',
              color:           range === r ? 'var(--accent-green)' : 'var(--text-dim)',
              borderColor:     range === r ? 'var(--border)' : 'transparent',
            }}
          >
            {r}
          </button>
        ))}
      </div>
      {history.length > 0
        ? <NetWorthLineChart data={history} range={range} />
        : <div className="h-[200px] flex items-center justify-center text-xs" style={{ color: 'var(--text-dim)' }}>
            No data yet — add your first net worth entry
          </div>
      }
    </StatCard>
  )
}
