import { useState } from 'react'
import { ExpenseEntryForm } from '../components/forms/ExpenseEntryForm'
import { BudgetBarChart }   from '../components/charts/BudgetBarChart'
import { useData }          from '../context/DataContext'
import { useBudget }        from '../hooks/useBudget'
import { calcSuggestedBudget } from '../lib/calculations'
import { formatMoney, formatDate, formatWeekLabel } from '../lib/formatters'
import { exportBudgetCSV }  from '../lib/csvExport'
import { supabase }         from '../lib/supabase'
import { useAuth }          from '../context/AuthContext'
import { Private }          from '../components/ui/Private'
import { Lightbulb, Download, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

const CATEGORY_COLORS = {
  'Food & Dining':     'var(--accent-green)',
  'Groceries':         'var(--accent-cyan)',
  'Transport':         'var(--accent-blue)',
  'Shopping':          'var(--accent-amber)',
  'Entertainment':     'var(--accent-red)',
  'Health & Personal': '#a78bfa',
  'Travel':            '#fb923c',
  'Miscellaneous':     'var(--text-dim)',
}

export function Budget() {
  const { budgetTargets, setExpenses } = useData()
  const { currentWeekSpend, currentWeekTotal, weeklyBudget, monthlyBudget,
          totalMonthlyPace, weekHistory, allExpenses } = useBudget()
  const { user } = useAuth()

  const [editingExpense,   setEditingExpense]   = useState(null)
  const [collapsedWeeks,   setCollapsedWeeks]   = useState(new Set())

  const toggleWeek = (key) => setCollapsedWeeks(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const handleDelete = async (exp) => {
    if (!confirm(`Delete "${exp.description}" (${formatMoney(exp.amount)})?`)) return
    if (user) await supabase.from('expenses').delete().eq('id', exp.id)
    setExpenses(prev => prev.filter(e => e.id !== exp.id))
  }

  // Build chart-compatible data from weekHistory
  const chartEntries = weekHistory.slice(0, 12).map(w => ({
    id:          w.weekKey,
    week_start:  w.weekKey,
    categories:  w.totals,
    total_spent: w.totalSpent,
  }))

  const suggestions = calcSuggestedBudget(
    // adapt to old format expected by calcSuggestedBudget
    weekHistory.map(w => ({ categories: w.totals, total_spent: w.totalSpent, week_start: w.weekKey }))
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Budget</h1>
        {allExpenses.length > 0 && (
          <button
            onClick={() => exportBudgetCSV(
              weekHistory.map(w => ({ categories: w.totals, total_spent: w.totalSpent, week_start: w.weekKey })),
              budgetTargets
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
          >
            <Download size={12} /> CSV
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Add expense form */}
        <div className="rounded-lg p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          {editingExpense ? (
            <>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Edit Expense</h2>
              <ExpenseEntryForm
                expense={editingExpense}
                onSuccess={() => setEditingExpense(null)}
                onCancel={() => setEditingExpense(null)}
              />
            </>
          ) : (
            <>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Add Expense</h2>
              <ExpenseEntryForm />

              {/* This week running total */}
              {Object.keys(currentWeekSpend).length > 0 && (
                <div className="mt-5 pt-4 border-t space-y-1.5" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>This Week</span>
                    <span
                      className="text-sm tabular-nums font-semibold"
                      style={{ color: currentWeekTotal > weeklyBudget ? 'var(--accent-red)' : 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <Private>{formatMoney(currentWeekTotal)}</Private>
                      <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-dim)' }}>/ {formatMoney(weeklyBudget)}</span>
                    </span>
                  </div>
                  {Object.entries(budgetTargets).map(([cat, target]) => {
                    const spent = currentWeekSpend[cat] ?? 0
                    if (spent === 0) return null
                    const weeklyTarget = target / 4.33
                    const pct = weeklyTarget > 0 ? (spent / weeklyTarget) * 100 : 0
                    const color = pct <= 60 ? 'var(--accent-green)' : pct <= 100 ? 'var(--accent-amber)' : 'var(--accent-red)'
                    return (
                      <div key={cat} className="flex justify-between text-xs">
                        <span style={{ color: 'var(--text-secondary)' }}>{cat}</span>
                        <span className="tabular-nums" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>
                          <Private>{formatMoney(spent)}</Private>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Chart or empty state */}
        <div className="rounded-lg p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Weekly Spending</h2>
          {chartEntries.length > 0
            ? <BudgetBarChart entries={chartEntries} targets={budgetTargets} />
            : <div className="h-[200px] flex items-center justify-center">
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Add expenses to see your chart</p>
              </div>
          }
        </div>
      </div>

      {/* Expense history grouped by week */}
      {weekHistory.length > 0 && (
        <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Expense History</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {weekHistory.map(week => {
              const collapsed = collapsedWeeks.has(week.weekKey)
              const over = week.totalSpent > weeklyBudget
              return (
                <div key={week.weekKey}>
                  {/* Week header — click to collapse */}
                  <button
                    type="button"
                    onClick={() => toggleWeek(week.weekKey)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:opacity-80 transition-opacity text-left"
                  >
                    <div className="flex items-center gap-2">
                      {collapsed ? <ChevronRight size={13} style={{ color: 'var(--text-dim)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text-dim)' }} />}
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {formatWeekLabel(week.weekStart)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded ml-1" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-dim)' }}>
                        {week.items.length} item{week.items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span
                      className="text-xs tabular-nums font-semibold"
                      style={{ color: over ? 'var(--accent-red)' : 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      <Private>{formatMoney(week.totalSpent)}</Private>
                      <span className="font-normal ml-1" style={{ color: 'var(--text-dim)' }}>/ {formatMoney(weeklyBudget)}</span>
                    </span>
                  </button>

                  {/* Individual expenses */}
                  {!collapsed && (
                    <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <table className="w-full text-xs">
                        <tbody>
                          {week.items.map(exp => (
                            <tr key={exp.id} className="group border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                              <td className="pl-10 pr-2 py-2.5 w-24 flex-shrink-0" style={{ color: 'var(--text-dim)' }}>
                                {formatDate(exp.date)}
                              </td>
                              <td className="py-2.5 pr-2 flex-1" style={{ color: 'var(--text-primary)' }}>
                                {exp.description}
                                {exp.notes && <span className="ml-1.5" style={{ color: 'var(--text-dim)' }}>· {exp.notes}</span>}
                              </td>
                              <td className="py-2.5 pr-2">
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: 'var(--bg-tertiary)', color: CATEGORY_COLORS[exp.category] ?? 'var(--text-dim)' }}
                                >
                                  {exp.category}
                                </span>
                              </td>
                              <td className="py-2.5 pr-2 text-right tabular-nums font-medium" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                                <Private>{formatMoney(exp.amount)}</Private>
                              </td>
                              <td className="py-2.5 pr-4 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => setEditingExpense(exp)}
                                    className="p-1 rounded hover:opacity-70"
                                    style={{ color: 'var(--accent-cyan)' }}
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(exp)}
                                    className="p-1 rounded hover:opacity-70"
                                    style={{ color: 'var(--accent-red)' }}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Smart Suggestions */}
      {suggestions ? (
        <div className="rounded-lg p-5 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={14} style={{ color: 'var(--accent-amber)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Smart Suggestions</h2>
            <span className="text-xs ml-auto" style={{ color: 'var(--text-dim)' }}>12-week avg × 1.10</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(suggestions).map(([cat, suggested]) => {
              const current = budgetTargets[cat] ?? 0
              const diff    = suggested - current
              return (
                <div key={cat} className="rounded p-3 border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
                  <div className="text-xs mb-1 truncate" style={{ color: 'var(--text-secondary)' }}>{cat}</div>
                  <div className="tabular-nums font-semibold text-sm" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatMoney(suggested)}/wk
                  </div>
                  <div className="text-xs mt-0.5 tabular-nums" style={{ color: diff > 0 ? 'var(--accent-red)' : 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {diff > 0 ? '+' : ''}{formatMoney(diff)} vs target
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : weekHistory.length > 0 && (
        <div className="rounded-lg p-4 border flex items-center gap-3" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <Lightbulb size={14} style={{ color: 'var(--text-dim)' }} />
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Smart suggestions unlock after <span style={{ color: 'var(--accent-amber)' }}>12 weeks</span> of data.
            You have <span style={{ color: 'var(--accent-cyan)' }}>{weekHistory.length}</span> week{weekHistory.length !== 1 ? 's' : ''} logged.
          </p>
        </div>
      )}
    </div>
  )
}
