import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { localDateString } from '../../lib/formatters'

const fieldStyle = {
  backgroundColor: 'var(--bg-primary)',
  borderColor: 'var(--border)',
  color: 'var(--text-primary)',
  fontFamily: "'JetBrains Mono', monospace",
}

export function ExpenseEntryForm({ expense, onSuccess, onCancel }) {
  const { user } = useAuth()
  const { budgetTargets, expenses, setExpenses } = useData()
  const categories = Object.keys(budgetTargets)

  const isEdit = !!expense

  const [date,        setDate]        = useState(isEdit ? expense.date        : localDateString())
  const [description, setDescription] = useState(isEdit ? expense.description : '')
  const [amount,      setAmount]      = useState(isEdit ? String(expense.amount) : '')
  const [category,    setCategory]    = useState(isEdit ? expense.category    : categories[0])
  const [notes,       setNotes]       = useState(isEdit ? (expense.notes ?? '') : '')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim()) return setError('Description is required')
    if (!amount || parseFloat(amount) <= 0) return setError('Enter a valid amount')
    setSaving(true)
    setError('')

    const payload = {
      date,
      description: description.trim(),
      amount:      parseFloat(amount),
      category,
      notes:       notes.trim() || null,
    }

    try {
      if (user) {
        if (isEdit) {
          const { data, error: err } = await supabase
            .from('expenses').update(payload).eq('id', expense.id).select().single()
          if (err) throw err
          setExpenses(prev => prev.map(e => e.id === expense.id ? data : e))
        } else {
          const { data, error: err } = await supabase
            .from('expenses').insert({ ...payload, user_id: user.id }).select().single()
          if (err) throw err
          setExpenses(prev => [data, ...prev])
          // Reset form for next entry (keep date + category for speed)
          setDescription('')
          setAmount('')
          setNotes('')
        }
      } else {
        const local = { ...payload, id: `local-${Date.now()}`, user_id: null, created_at: new Date().toISOString() }
        if (isEdit) {
          setExpenses(prev => prev.map(e => e.id === expense.id ? local : e))
        } else {
          setExpenses(prev => [local, ...prev])
          setDescription('')
          setAmount('')
          setNotes('')
        }
      }
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Description */}
      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. Chipotle, Uber, Amazon..."
          autoFocus
          className="w-full text-sm px-2 py-1.5 rounded border outline-none"
          style={{ ...fieldStyle, fontFamily: 'inherit' }}
        />
      </div>

      {/* Amount + Category on same row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Amount</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-dim)' }}>$</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full text-sm pl-5 pr-2 py-1.5 rounded border outline-none"
              style={fieldStyle}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full text-sm px-2 py-1.5 rounded border outline-none"
            style={fieldStyle}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Date</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full text-sm px-2 py-1.5 rounded border outline-none"
          style={fieldStyle}
        />
      </div>

      {/* Notes */}
      <input
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full text-sm px-2 py-1.5 rounded border outline-none"
        style={{ ...fieldStyle, fontFamily: 'inherit' }}
      />

      {error && <p className="text-xs" style={{ color: 'var(--accent-red)' }}>{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 rounded font-semibold text-sm transition-opacity"
          style={{ backgroundColor: 'var(--accent-green)', color: '#0a0e1a', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving...' : isEdit ? 'Update Expense' : '+ Add Expense'}
        </button>
        {isEdit && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded text-sm"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
        )}
      </div>

      {!isEdit && (
        <p className="text-[10px] text-center" style={{ color: 'var(--text-dim)' }}>
          Form stays open — keep adding expenses one by one
        </p>
      )}
    </form>
  )
}
