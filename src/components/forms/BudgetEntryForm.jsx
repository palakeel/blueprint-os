import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { getWeekStart, formatWeekLabel, formatMoney } from '../../lib/formatters'
import { processBudgetSave } from '../../lib/gamificationActions'
import { useToast }          from '../../context/ToastContext'
import { BADGE_DEFINITIONS } from '../../lib/gamification'

const fieldStyle = {
  backgroundColor: 'var(--bg-primary)',
  borderColor: 'var(--border)',
  color: 'var(--text-primary)',
  fontFamily: "'JetBrains Mono', monospace",
}

export function BudgetEntryForm({ entry, onSuccess }) {
  const { user } = useAuth()
  const { budgetTargets, setBudgetEntries, gamification, setGamification, latestNetWorth, prevNetWorth } = useData()
  const { addToast } = useToast()

  const isEdit    = !!entry
  const weekStart = isEdit ? new Date(entry.week_start) : getWeekStart()
  const weekEnd   = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const [categories, setCategories] = useState(
    Object.fromEntries(
      Object.keys(budgetTargets).map(k => [k, isEdit ? String(entry.categories?.[k] ?? '') : ''])
    )
  )
  const [notes,  setNotes]  = useState(isEdit ? (entry.notes ?? '') : '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const totalSpent   = Object.values(categories).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const monthlyBudget = Object.values(budgetTargets).reduce((a, b) => a + b, 0)
  const weeklyBudget  = monthlyBudget / 4.33

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const cats = Object.fromEntries(
      Object.entries(categories).map(([k, v]) => [k, parseFloat(v) || 0])
    )

    const payload = {
      categories:  cats,
      total_spent: totalSpent,
      notes,
    }

    try {
      if (user) {
        if (isEdit) {
          const { data, error: err } = await supabase
            .from('budget_entries').update(payload).eq('id', entry.id).select().single()
          if (err) throw err
          setBudgetEntries(prev => prev.map(e => e.id === entry.id ? data : e))
        } else {
          const { data, error: err } = await supabase
            .from('budget_entries')
            .insert({ ...payload, user_id: user.id, week_start: weekStart.toISOString().split('T')[0], week_end: weekEnd.toISOString().split('T')[0], weekly_score: null })
            .select().single()
          if (err) throw err
          setBudgetEntries(prev => [data, ...prev])
          processBudgetSave(user, gamification, {
            savedEntry: data, totalSpent, weeklyBudget,
            netWorthNow: latestNetWorth?.net_worth, netWorthPrev: prevNetWorth?.net_worth, weekStart,
          }).then(result => {
            if (result?.updated) setGamification(result.updated)
            for (const badge of result?.newBadges ?? []) {
              const def = BADGE_DEFINITIONS.find(b => b.id === badge.id)
              if (def) addToast({ icon: def.icon, title: 'Achievement Unlocked!', message: def.name })
            }
          })
        }
      } else {
        const local = { ...payload, id: isEdit ? entry.id : `local-${Date.now()}`, week_start: weekStart.toISOString().split('T')[0], week_end: weekEnd.toISOString().split('T')[0], created_at: new Date().toISOString() }
        setBudgetEntries(prev => isEdit ? prev.map(e => e.id === entry.id ? local : e) : [local, ...prev])
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
        {isEdit && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--accent-amber)', color: '#0a0e1a' }}>EDITING</span>}
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
                <span className="ml-1" style={{ color: 'var(--text-dim)' }}>({formatMoney(target / 4.33)}/wk)</span>
              </label>
              <div className="relative w-28">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-dim)' }}>$</span>
                <input
                  type="number"
                  value={categories[cat]}
                  onChange={e => setCategories(c => ({ ...c, [cat]: e.target.value }))}
                  placeholder="0" step="0.01" min="0"
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
          <span className="tabular-nums text-base font-semibold"
            style={{ color: totalSpent > weeklyBudget ? 'var(--accent-red)' : 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}>
            {formatMoney(totalSpent)}
          </span>
          <span className="text-xs ml-1" style={{ color: 'var(--text-dim)' }}>/ {formatMoney(weeklyBudget)}</span>
        </div>
      </div>

      <textarea
        value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)" rows={2}
        className="w-full text-sm px-2 py-1.5 rounded border outline-none resize-none"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      />

      {error && <p className="text-sm" style={{ color: 'var(--accent-amber)' }}>{error}</p>}

      <button type="submit" disabled={saving}
        className="w-full py-2.5 rounded font-semibold text-sm transition-opacity"
        style={{ backgroundColor: 'var(--accent-blue)', color: 'white', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving...' : isEdit ? 'Update Entry' : 'Save Budget Entry'}
      </button>
    </form>
  )
}
