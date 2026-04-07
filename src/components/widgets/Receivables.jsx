import { useState } from 'react'
import { StatCard } from '../ui/StatCard'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { formatMoney } from '../../lib/formatters'
import { supabase } from '../../lib/supabase'
import { CheckCircle, Plus } from 'lucide-react'

const inputStyle = { backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function Receivables() {
  const { receivables, setReceivables } = useData()
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ person_name: '', amount: '', description: '' })
  const [saving, setSaving] = useState(false)

  const pending = receivables.filter(r => !r.is_received)
  const total   = pending.reduce((s, r) => s + r.amount, 0)

  const markReceived = async (id) => {
    const now = new Date().toISOString()
    setReceivables(prev => prev.map(r => r.id === id ? { ...r, is_received: true, received_date: now } : r))
    if (user && !id.startsWith('seed')) {
      await supabase.from('receivables').update({ is_received: true, received_date: now }).eq('id', id)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    const rec = {
      person_name:  form.person_name,
      amount:       parseFloat(form.amount),
      description:  form.description,
      created_date: new Date().toISOString(),
      is_received:  false,
    }
    const tempId = `local-${Date.now()}`
    setReceivables(prev => [{ ...rec, id: tempId }, ...prev])
    if (user) {
      const { data } = await supabase.from('receivables').insert({ ...rec, user_id: user.id }).select().single()
      if (data) setReceivables(prev => prev.map(r => r.id === tempId ? data : r))
    }
    setForm({ person_name: '', amount: '', description: '' })
    setShowForm(false)
    setSaving(false)
  }

  return (
    <StatCard title="Receivables">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm tabular-nums font-semibold" style={{ color: 'var(--accent-amber)', fontFamily: "'JetBrains Mono', monospace" }}>
            {formatMoney(total)} pending
          </span>
          <button
            onClick={() => setShowForm(f => !f)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded"
            style={{ color: 'var(--accent-cyan)', backgroundColor: 'var(--bg-tertiary)' }}
          >
            <Plus size={12} /> Add
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="space-y-2 p-3 rounded border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
            <input value={form.person_name} onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))}
              placeholder="Person" required
              className="w-full text-xs px-2 py-1.5 rounded border outline-none"
              style={inputStyle} />
            <input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="Amount" type="number" step="0.01" min="0" required
              className="w-full text-xs px-2 py-1.5 rounded border outline-none"
              style={inputStyle} />
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
              className="w-full text-xs px-2 py-1.5 rounded border outline-none"
              style={inputStyle} />
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="flex-1 text-xs py-1 rounded font-medium"
                style={{ backgroundColor: 'var(--accent-blue)', color: 'white' }}>
                {saving ? '...' : 'Add'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 text-xs py-1 rounded"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {pending.length === 0 ? (
          <p className="text-xs text-center py-3" style={{ color: 'var(--text-dim)' }}>No pending receivables</p>
        ) : (
          pending.map(r => (
            <div key={r.id} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.person_name}</div>
                {r.description && <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{r.description}</div>}
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-sm font-semibold" style={{ color: 'var(--accent-amber)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatMoney(r.amount)}
                </span>
                <button onClick={() => markReceived(r.id)} className="hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--accent-green)' }}>
                  <CheckCircle size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </StatCard>
  )
}
