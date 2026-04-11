import { useState } from 'react'
import { StatCard } from '../ui/StatCard'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { formatMoney, localDateString } from '../../lib/formatters'
import { Private } from '../ui/Private'
import { supabase } from '../../lib/supabase'
import { CheckCircle, Plus, ChevronDown, Pencil, Trash2 } from 'lucide-react'

const inputStyle = { backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

export function Receivables() {
  const { receivables, setReceivables } = useData()
  const { user } = useAuth()
  const [showForm,    setShowForm]    = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [form, setForm] = useState({ person_name: '', amount: '', description: '' })
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const pending  = receivables.filter(r => !r.is_received)
  const received = receivables.filter(r => r.is_received)
  const total    = pending.reduce((s, r) => s + r.amount, 0)

  const markReceived = async (id) => {
    const now = localDateString()
    const isTemp = id.startsWith('seed') || id.startsWith('local')
    if (user && isTemp) {
      // Seed/local entries were never saved to Supabase — insert first, then mark received
      const rec = receivables.find(r => r.id === id)
      const { data } = await supabase.from('receivables')
        .insert({ person_name: rec.person_name, amount: rec.amount, description: rec.description, created_date: rec.created_date, is_received: true, received_date: now, user_id: user.id })
        .select().single()
      if (data) setReceivables(prev => prev.map(r => r.id === id ? data : r))
    } else {
      setReceivables(prev => prev.map(r => r.id === id ? { ...r, is_received: true, received_date: now } : r))
      if (user) {
        await supabase.from('receivables').update({ is_received: true, received_date: now }).eq('id', id)
      }
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    if (editingId) {
      const updates = { person_name: form.person_name, amount: parseFloat(form.amount), description: form.description }
      setReceivables(prev => prev.map(r => r.id === editingId ? { ...r, ...updates } : r))
      if (user && !editingId.startsWith('local') && !editingId.startsWith('seed')) {
        await supabase.from('receivables').update(updates).eq('id', editingId)
      }
      setEditingId(null)
    } else {
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
    }
    setForm({ person_name: '', amount: '', description: '' })
    setShowForm(false)
    setSaving(false)
  }

  const handleDelete = async (r) => {
    if (!confirm(`Delete receivable for ${r.person_name}?`)) return
    setReceivables(prev => prev.filter(x => x.id !== r.id))
    if (user && !r.id.startsWith('local') && !r.id.startsWith('seed')) {
      await supabase.from('receivables').delete().eq('id', r.id)
    }
  }

  const startEdit = (r) => {
    setForm({ person_name: r.person_name, amount: String(r.amount), description: r.description ?? '' })
    setEditingId(r.id)
    setShowForm(true)
  }

  return (
    <StatCard title="Receivables">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm tabular-nums font-semibold" style={{ color: 'var(--accent-amber)', fontFamily: "'JetBrains Mono', monospace" }}>
            <Private>{formatMoney(total)} pending</Private>
          </span>
          <button
            onClick={() => { setShowForm(f => !f); setEditingId(null); setForm({ person_name: '', amount: '', description: '' }) }}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded"
            style={{ color: 'var(--accent-cyan)', backgroundColor: 'var(--bg-tertiary)' }}
          >
            <Plus size={12} /> Add
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="space-y-2 p-3 rounded border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
            {editingId && <div className="text-[10px] px-1.5 py-0.5 rounded inline-block" style={{ backgroundColor: 'var(--accent-amber)', color: '#0a0e1a' }}>EDITING</div>}
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
                {saving ? '...' : editingId ? 'Update' : 'Add'}
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
            <div key={r.id} className="flex items-center justify-between py-1.5 border-b last:border-0 group" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.person_name}</div>
                {r.description && <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{r.description}</div>}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="tabular-nums text-sm font-semibold" style={{ color: 'var(--accent-amber)', fontFamily: "'JetBrains Mono', monospace" }}>
                  <Private>{formatMoney(r.amount)}</Private>
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(r)} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--accent-cyan)' }}>
                    <Pencil size={11} />
                  </button>
                  <button onClick={() => handleDelete(r)} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--accent-red)' }}>
                    <Trash2 size={11} />
                  </button>
                </div>
                <button onClick={() => markReceived(r.id)} className="hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--accent-green)' }}>
                  <CheckCircle size={16} />
                </button>
              </div>
            </div>
          ))
        )}

        {received.length > 0 && (
          <button
            onClick={() => setShowHistory(h => !h)}
            className="flex items-center gap-1 text-xs mt-1 w-full justify-center pt-1"
            style={{ color: 'var(--text-dim)' }}
          >
            <ChevronDown size={12} style={{ transform: showHistory ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            {showHistory ? 'Hide' : `${received.length} received`}
          </button>
        )}
        {showHistory && received.map(r => (
          <div key={r.id} className="flex items-center justify-between py-1.5 border-b last:border-0 opacity-50" style={{ borderColor: 'var(--border)' }}>
            <div>
              <div className="text-sm line-through" style={{ color: 'var(--text-secondary)' }}>{r.person_name}</div>
              {r.description && <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{r.description}</div>}
            </div>
            <span className="tabular-nums text-sm" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
              <Private>{formatMoney(r.amount)}</Private>
            </span>
          </div>
        ))}
      </div>
    </StatCard>
  )
}
