import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { getWeekStart, formatWeekLabel, formatMoney } from '../../lib/formatters'

const fieldStyle = {
  backgroundColor: 'var(--bg-primary)',
  borderColor: 'var(--border)',
  color: 'var(--text-primary)',
  fontFamily: "'JetBrains Mono', monospace",
}

export function BudgetEntryForm({ onSuccess }) {
  const { user } = useAuth()
  const { budgetTargets, setBudgetEntries } = useData()

  const weekStart = getWeekStart()
  const weekEnd   = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const [categories, setCategories] = useState(
    Object.fromEntries(Object.keys(budgetTargets).map(k => [k, '']))
  )
  const [notes,  setNotes]  = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const totalSpent  = Object.values(categories).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const weeklyBudget = Object.values(budgetTargets).reduce((a, b) => a + b, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const cats = Object.fromEntries(
      Object.entries(categories).map(([k, v]) => [k, parseFloat(v) || 0])
    )

    const entry = {
      user_id:      user?.id,
      week_start:   weekStart.toISOString().split('T')[0],
      week_end:     weekEnd.toISOString().split('T')[0],
      categories:   cats,
      total_spent:  totalSpent,
      weekly_score: null,
      notes,
    }

    try {
      if (user) {
        const { data, error: err } = await supabase.from('budget_entries').insert(entry).select().single()
        if (err) throw err
        setBudgetEntries(prev => [data, ...prev])
      } else {
        setBudgetEntries(prev => [{ ...entry, id: `local-${Date.now()}`, created_at: new Date().toISOString() }, ...prev])
      }
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Week: <span style={{ color: 'var(--accent-cyan)' }}>{formatWeekLabel(weekStart)}</span>
      </div>

      <div className="space-y-2">
        {Object.entries(budgetTargets).map(([cat, target]) => {
          const spent = parseFloat(categories[cat]) || 0
          const pct   = target > 0 ? (spent / target) * 100 : 0
          const color = pct <= 60 ? 'var(--accent-green)' : pct <= 100 ? 'var(--accent-amber)' : 'var(--accent-red)'
          return (
            <div key={cat} className="flex items-center gap-3">
              <label className="flex-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {cat}
                <span className="ml-1" style={{ color: 'var(--text-dim)' }}>({formatMoney(target)}/wk)</span>
              </label>
              <div className="relative w-28">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-dim)' }}>$</span>
                <input
                  type="number"
                  value={categories[cat]}
                  onChange={e => setCategories(c => ({ ...c, [cat]: e.target.value }))}
                  placeholder="0"
                  step="0.01"
                  min="0"
                  className="w-full text-right text-sm pl-5 pr-2 py-1.5 rounded border outline-none"
                  style={{ ...fieldStyle, color }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t pt-3 flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Spent</span>
        <div className="text-right">
          <span
            className="tabular-nums text-base font-semibold"
            style={{ color: totalSpent > weeklyBudget ? 'var(--accent-red)' : 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}
          >
            {formatMoney(totalSpent)}
          </span>
          <span className="text-xs ml-1" style={{ color: 'var(--text-dim)' }}>/ {formatMoney(weeklyBudget)}</span>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="w-full text-sm px-2 py-1.5 rounded border outline-none resize-none"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      />

      {error && <p className="text-sm" style={{ color: 'var(--accent-amber)' }}>{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-2.5 rounded font-semibold text-sm transition-opacity"
        style={{ backgroundColor: 'var(--accent-blue)', color: 'white', opacity: saving ? 0.7 : 1 }}
      >
        {saving ? 'Saving...' : 'Save Budget Entry'}
      </button>
    </form>
  )
}
