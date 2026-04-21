import { useState } from 'react'
import { useMilestones }  from '../hooks/useMilestones'
import { ProgressBar }    from '../components/ui/ProgressBar'
import { formatMoney }    from '../lib/formatters'
import { Private }        from '../components/ui/Private'
import { supabase }       from '../lib/supabase'
import { useAuth }        from '../context/AuthContext'
import { useData }        from '../context/DataContext'
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react'

const fieldStyle = {
  backgroundColor: 'var(--bg-primary)',
  borderColor: 'var(--border)',
  color: 'var(--text-primary)',
  fontFamily: "'JetBrains Mono', monospace",
}

function MilestoneForm({ existing, onSuccess, onCancel }) {
  const { user } = useAuth()
  const { milestones, setMilestones } = useData()
  const [name,   setName]   = useState(existing?.name ?? '')
  const [target, setTarget] = useState(existing ? String(existing.target_amount) : '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !target) return
    setSaving(true)
    setError('')
    try {
      const payload = { name: name.trim(), target_amount: parseFloat(target) }
      if (existing) {
        const { data, error: err } = await supabase
          .from('milestones').update(payload)
          .eq('user_id', user.id).eq('id', existing.id)
          .select().single()
        if (err) throw err
        setMilestones(prev => prev.map(m => m.id === existing.id ? { ...m, ...data } : m))
      } else {
        const { data, error: err } = await supabase
          .from('milestones').insert({ ...payload, user_id: user.id })
          .select().single()
        if (err) throw err
        setMilestones(prev => [...prev, data].sort((a, b) => a.target_amount - b.target_amount))
      }
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-5 space-y-3"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--accent-cyan)' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {existing ? 'Edit Milestone' : 'New Milestone'}
        </h2>
        <button type="button" onClick={onCancel} style={{ color: 'var(--text-dim)' }}>
          <X size={14} />
        </button>
      </div>
      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. First $100k" required
          className="w-full text-sm px-2 py-1.5 rounded border outline-none"
          style={{ ...fieldStyle, fontFamily: 'inherit' }} />
      </div>
      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Target Amount</label>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-dim)' }}>$</span>
          <input type="number" value={target} onChange={e => setTarget(e.target.value)}
            placeholder="100000" step="1000" min="0" required
            className="w-full text-sm pl-5 pr-2 py-1.5 rounded border outline-none"
            style={fieldStyle} />
        </div>
      </div>
      {error && <p className="text-xs" style={{ color: 'var(--accent-red)' }}>{error}</p>}
      <button type="submit" disabled={saving}
        className="w-full py-2 rounded text-sm font-semibold transition-opacity"
        style={{ backgroundColor: 'var(--accent-green)', color: '#0a0e1a', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving…' : existing ? 'Update' : 'Add Milestone'}
      </button>
    </form>
  )
}

export function Milestones() {
  const { milestones, monthlyGrowthRate } = useMilestones()
  const { milestones: raw, setMilestones } = useData()
  const { user } = useAuth()
  const [showForm,   setShowForm]   = useState(false)
  const [editingId,  setEditingId]  = useState(null)

  const handleDelete = async (m) => {
    if (!confirm(`Delete "${m.name}"?`)) return
    await supabase.from('milestones').delete().eq('user_id', user.id).eq('id', m.id)
    setMilestones(prev => prev.filter(x => x.id !== m.id))
  }

  const handleMarkAchieved = async (m) => {
    const now = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('milestones').update({ is_achieved: !m.is_achieved, achieved_date: m.is_achieved ? null : now })
      .eq('user_id', user.id).eq('id', m.id).select().single()
    if (data) setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, ...data } : x))
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Life Milestones</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Velocity: <span className="tabular-nums" style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}>
              <Private>+{formatMoney(monthlyGrowthRate)}/mo</Private>
            </span>
          </span>
          <button
            onClick={() => { setShowForm(true); setEditingId(null) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--accent-green)', color: '#0a0e1a' }}>
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {showForm && (
          <MilestoneForm onSuccess={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
        )}

        {milestones.length === 0 && !showForm && (
          <div className="rounded-lg border p-10 flex flex-col items-center justify-center gap-3 text-center"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>No milestones yet</p>
            <button onClick={() => setShowForm(true)}
              className="text-xs px-3 py-1.5 rounded border transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}>
              + Add your first milestone
            </button>
          </div>
        )}

        {milestones.map(m => (
          editingId === m.id ? (
            <MilestoneForm key={m.id}
              existing={raw.find(x => x.id === m.id)}
              onSuccess={() => setEditingId(null)}
              onCancel={() => setEditingId(null)} />
          ) : (
            <div key={m.id}
              className="stat-card rounded-lg p-5 border group"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: m.is_achieved ? 'var(--accent-amber)' : 'var(--border)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-base" style={{ color: m.is_achieved ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                    {m.is_achieved ? '✓ ' : ''}{m.name}
                  </h2>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                    Target: <span className="tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      <Private>{formatMoney(m.target_amount)}</Private>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="tabular-nums text-xl font-bold" style={{ color: m.is_achieved ? 'var(--accent-amber)' : 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                      <Private>{m.progress.toFixed(1)}%</Private>
                    </div>
                    {!m.is_achieved && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--accent-cyan)' }}>{m.eta}</div>
                    )}
                  </div>
                  {/* Actions — show on hover */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleMarkAchieved(m)} title={m.is_achieved ? 'Unmark' : 'Mark achieved'}
                      className="p-1 rounded hover:opacity-70"
                      style={{ color: m.is_achieved ? 'var(--text-dim)' : 'var(--accent-green)' }}>
                      <Check size={12} />
                    </button>
                    <button onClick={() => { setEditingId(m.id); setShowForm(false) }}
                      className="p-1 rounded hover:opacity-70" style={{ color: 'var(--accent-cyan)' }}>
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDelete(m)}
                      className="p-1 rounded hover:opacity-70" style={{ color: 'var(--accent-red)' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>

              <ProgressBar
                value={m.current_amount}
                max={m.target_amount}
                color={m.is_achieved ? 'var(--accent-amber)' : 'var(--accent-green)'}
                height={8}
              />

              <div className="flex justify-between mt-2 text-xs tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ color: 'var(--accent-green)' }}><Private>{formatMoney(m.current_amount)}</Private></span>
                <span style={{ color: 'var(--text-dim)' }}><Private>{formatMoney(m.target_amount)}</Private></span>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  )
}
