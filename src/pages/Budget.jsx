import { useState } from 'react'
import { BudgetEntryForm } from '../components/forms/BudgetEntryForm'
import { BudgetBarChart }  from '../components/charts/BudgetBarChart'
import { useData }         from '../context/DataContext'
import { formatMoney, formatDate } from '../lib/formatters'

export function Budget() {
  const { budgetEntries, budgetTargets } = useData()
  const [showForm, setShowForm] = useState(false)
  const weeklyBudget = Object.values(budgetTargets).reduce((a, b) => a + b, 0)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Weekly Budget</h1>
        <button
          onClick={() => setShowForm(f => !f)}
          className="px-3 py-1.5 rounded text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--accent-blue)', color: 'white' }}
        >
          {showForm ? 'Cancel' : '+ New Entry'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          {showForm ? (
            <>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>New Entry</h2>
              <BudgetEntryForm onSuccess={() => setShowForm(false)} />
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Spending History</h2>
              {budgetEntries.length > 0
                ? <BudgetBarChart entries={budgetEntries} targets={budgetTargets} />
                : <div className="h-[200px] flex flex-col items-center justify-center gap-2">
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>No entries yet</p>
                    <button onClick={() => setShowForm(true)} className="text-sm" style={{ color: 'var(--accent-blue)' }}>
                      Add your first entry →
                    </button>
                  </div>
              }
            </>
          )}
        </div>

        <div className="rounded-lg p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>History</h2>
          {budgetEntries.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>No history yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: 'var(--text-dim)' }}>
                    <th className="text-left pb-2 font-medium">Week</th>
                    <th className="text-right pb-2 font-medium">Spent</th>
                    <th className="text-right pb-2 font-medium">Budget</th>
                    <th className="text-right pb-2 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetEntries.map(entry => {
                    const over = entry.total_spent > weeklyBudget
                    return (
                      <tr key={entry.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-2" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(entry.week_start)}
                        </td>
                        <td className="py-2 text-right tabular-nums" style={{ color: over ? 'var(--accent-red)' : 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatMoney(entry.total_spent)}
                        </td>
                        <td className="py-2 text-right tabular-nums" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                          {formatMoney(weeklyBudget)}
                        </td>
                        <td className="py-2 text-right" style={{ color: entry.weekly_score != null ? 'var(--accent-amber)' : 'var(--text-dim)' }}>
                          {entry.weekly_score ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
