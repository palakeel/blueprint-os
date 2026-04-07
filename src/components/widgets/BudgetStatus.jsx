import { StatCard } from '../ui/StatCard'
import { ProgressBar } from '../ui/ProgressBar'
import { TrafficLight } from '../ui/TrafficLight'
import { useBudget } from '../../hooks/useBudget'
import { useData } from '../../context/DataContext'
import { formatMoney } from '../../lib/formatters'

export function BudgetStatus() {
  const { currentWeekSpend, latestEntry } = useBudget()
  const { budgetTargets: targets } = useData()

  return (
    <StatCard title="Budget Status">
      {!latestEntry && (
        <p className="text-xs mb-2" style={{ color: 'var(--text-dim)' }}>No entries yet — showing targets</p>
      )}
      <div className="space-y-2.5">
        {Object.entries(targets).map(([cat, target]) => {
          const spent = currentWeekSpend[cat] ?? 0
          const pct   = target > 0 ? (spent / target) * 100 : 0
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <TrafficLight pct={pct} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{cat}</span>
                </div>
                <div className="flex items-center gap-1 text-xs tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <span style={{ color: 'var(--text-primary)' }}>{formatMoney(spent)}</span>
                  <span style={{ color: 'var(--text-dim)' }}>/{formatMoney(target)}</span>
                </div>
              </div>
              <ProgressBar value={spent} max={target} color="traffic" height={4} />
            </div>
          )
        })}
      </div>
    </StatCard>
  )
}
