import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'

const fieldStyle = {
  backgroundColor: 'var(--bg-primary)',
  borderColor: 'var(--border)',
  color: 'var(--text-primary)',
  fontFamily: "'JetBrains Mono', monospace",
}

export function EditPositionForm({ position, onSuccess }) {
  const { user } = useAuth()
  const { portfolio, setPortfolio } = useData()

  const [ticker,     setTicker]     = useState(position?.ticker ?? '')
  const [shares,     setShares]     = useState(position ? String(position.shares) : '')
  const [avgCost,    setAvgCost]    = useState(position ? String(position.avg_cost) : '')
  const [target,     setTarget]     = useState(position ? String(position.target_allocation ?? '') : '')
  const [dca,        setDca]        = useState(position ? String(position.dca_biweekly ?? '') : '')
  const [notes,      setNotes]      = useState(position?.notes ?? '')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const isNew = !position

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      ticker:            ticker.toUpperCase().trim(),
      shares:            parseFloat(shares) || 0,
      avg_cost:          parseFloat(avgCost) || 0,
      target_allocation: parseFloat(target) || null,
      dca_biweekly:      parseFloat(dca) || null,
      notes:             notes || null,
      updated_at:        new Date().toISOString(),
    }

    try {
      if (user) {
        if (isNew) {
          const { data, error: err } = await supabase
            .from('portfolio_positions')
            .insert({ ...payload, user_id: user.id })
            .select().single()
          if (err) throw err
          setPortfolio(prev => [...prev, data])
        } else {
          const { data, error: err } = await supabase
            .from('portfolio_positions')
            .update(payload)
            .eq('user_id', user.id)
            .eq('id', position.id)
            .select().single()
          if (err) throw err
          setPortfolio(prev => prev.map(p => p.id === position.id ? data : p))
        }
      } else {
        if (isNew) {
          setPortfolio(prev => [...prev, { ...payload, id: `local-${Date.now()}` }])
        } else {
          setPortfolio(prev => prev.map(p => p.id === position.id ? { ...p, ...payload } : p))
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
      {isNew && (
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Ticker</label>
          <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
            placeholder="e.g. AAPL" required
            className="w-full text-sm px-2 py-1.5 rounded border outline-none"
            style={fieldStyle} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Shares</label>
          <input type="number" value={shares} onChange={e => setShares(e.target.value)}
            placeholder="0.0000" step="0.0001" min="0"
            className="w-full text-sm px-2 py-1.5 rounded border outline-none"
            style={fieldStyle} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Avg Cost</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-dim)' }}>$</span>
            <input type="number" value={avgCost} onChange={e => setAvgCost(e.target.value)}
              placeholder="0.00" step="0.01" min="0"
              className="w-full text-sm pl-5 pr-2 py-1.5 rounded border outline-none"
              style={fieldStyle} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Target Alloc %</label>
          <input type="number" value={target} onChange={e => setTarget(e.target.value)}
            placeholder="0" step="1" min="0" max="100"
            className="w-full text-sm px-2 py-1.5 rounded border outline-none"
            style={fieldStyle} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>DCA / 2wk</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-dim)' }}>$</span>
            <input type="number" value={dca} onChange={e => setDca(e.target.value)}
              placeholder="—" step="1" min="0"
              className="w-full text-sm pl-5 pr-2 py-1.5 rounded border outline-none"
              style={fieldStyle} />
          </div>
        </div>
      </div>

      <input value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full text-sm px-2 py-1.5 rounded border outline-none"
        style={{ ...fieldStyle, fontFamily: 'inherit' }} />

      {error && <p className="text-xs" style={{ color: 'var(--accent-red)' }}>{error}</p>}

      <button type="submit" disabled={saving}
        className="w-full py-2.5 rounded font-semibold text-sm transition-opacity"
        style={{ backgroundColor: 'var(--accent-blue)', color: 'white', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving...' : isNew ? 'Add Position' : 'Update Position'}
      </button>
    </form>
  )
}
