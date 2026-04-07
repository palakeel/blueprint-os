import { useState } from 'react'
import { NetWorthEntryForm }  from '../components/forms/NetWorthEntryForm'
import { NetWorthLineChart }  from '../components/charts/NetWorthLineChart'
import { useNetWorth }        from '../hooks/useNetWorth'
import { formatMoneyFull, formatChange, formatPercent, formatDate } from '../lib/formatters'

const RANGES = ['3M', '6M', '1Y', 'ALL']

export function NetWorth() {
  const { history, current, momChange, momPct } = useNetWorth()
  const [showForm, setShowForm] = useState(false)
  const [range, setRange]       = useState('ALL')

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Net Worth</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="tabular-nums text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
              {formatMoneyFull(current)}
            </span>
            <span className="tabular-nums text-sm" style={{ color: momChange >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontFamily: "'JetBrains Mono', monospace" }}>
              {formatChange(momChange)} ({formatPercent(momPct)})
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="px-3 py-1.5 rounded text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--accent-green)', color: '#0a0e1a' }}
        >
          {showForm ? 'Cancel' : '+ Update'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>History</h2>
            <div className="flex gap-1">
              {RANGES.map(r => (
                <button key={r} onClick={() => setRange(r)}
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
          </div>
          {history.length > 0
            ? <NetWorthLineChart data={history} range={range} />
            : <div className="h-[200px] flex items-center justify-center text-xs" style={{ color: 'var(--text-dim)' }}>
                No data — add your first entry
              </div>
          }
        </div>

        <div className="rounded-lg p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          {showForm ? (
            <>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>New Entry</h2>
              <div className="max-h-[70vh] overflow-y-auto pr-1">
                <NetWorthEntryForm onSuccess={() => setShowForm(false)} />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Log</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ color: 'var(--text-dim)' }}>
                      <th className="text-left pb-2 font-medium">Date</th>
                      <th className="text-right pb-2 font-medium">Net Worth</th>
                      <th className="text-right pb-2 font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry, i) => {
                      const prev   = history[i + 1]
                      const change = prev ? entry.net_worth - prev.net_worth : null
                      return (
                        <tr key={entry.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                          <td className="py-2" style={{ color: 'var(--text-secondary)' }}>
                            {formatDate(entry.entry_date)}
                          </td>
                          <td className="py-2 text-right tabular-nums font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {formatMoneyFull(entry.net_worth)}
                          </td>
                          <td className="py-2 text-right tabular-nums" style={{ color: change == null ? 'var(--text-dim)' : change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {change != null ? formatChange(change) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
