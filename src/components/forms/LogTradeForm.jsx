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

export function LogTradeForm({ onSuccess }) {
  const { user } = useAuth()
  const { portfolio, setPortfolio } = useData()

  const tickers = portfolio.map(p => p.ticker)

  const [ticker,  setTicker]  = useState(tickers[0] ?? '')
  const [type,    setType]    = useState('DCA')
  const [shares,  setShares]  = useState('')
  const [price,   setPrice]   = useState('')
  const [date,    setDate]    = useState(localDateString())
  const [notes,   setNotes]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const cost = (parseFloat(shares) || 0) * (parseFloat(price) || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const sharesNum = parseFloat(shares)
    const priceNum  = parseFloat(price)
    if (!sharesNum || !priceNum) { setError('Shares and price are required'); setSaving(false); return }

    const pos = portfolio.find(p => p.ticker === ticker)
    if (!pos) { setError('Ticker not found'); setSaving(false); return }

    // Weighted avg cost formula
    const oldShares = parseFloat(pos.shares) || 0
    const newShares = oldShares + sharesNum
    const newAvg    = newShares > 0
      ? (oldShares * (parseFloat(pos.avg_cost) || 0) + sharesNum * priceNum) / newShares
      : priceNum

    try {
      if (user) {
        // Save trade to history
        await supabase.from('trade_history').insert({
          user_id:    user.id,
          ticker,
          trade_type: type,
          shares:     sharesNum,
          price:      priceNum,
          total_cost: cost,
          trade_date: date,
          notes:      notes || null,
        })

        // Update portfolio position
        const { data, error: err } = await supabase
          .from('portfolio_positions')
          .update({ shares: newShares, avg_cost: parseFloat(newAvg.toFixed(4)), updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('ticker', ticker)
          .select().single()
        if (err) throw err
        setPortfolio(prev => prev.map(p => p.ticker === ticker ? data : p))
      } else {
        setPortfolio(prev => prev.map(p =>
          p.ticker === ticker ? { ...p, shares: newShares, avg_cost: parseFloat(newAvg.toFixed(4)) } : p
        ))
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Ticker</label>
          <select value={ticker} onChange={e => setTicker(e.target.value)}
            className="w-full text-sm px-2 py-1.5 rounded border outline-none"
            style={fieldStyle}>
            {tickers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Type</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full text-sm px-2 py-1.5 rounded border outline-none"
            style={fieldStyle}>
            <option value="DCA">DCA</option>
            <option value="Limit Fill">Limit Fill</option>
            <option value="Manual Buy">Manual Buy</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Shares</label>
          <input type="number" value={shares} onChange={e => setShares(e.target.value)}
            placeholder="0.000" step="0.0001" min="0" required
            className="w-full text-sm px-2 py-1.5 rounded border outline-none"
            style={fieldStyle} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Fill Price</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-dim)' }}>$</span>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              placeholder="0.00" step="0.01" min="0" required
              className="w-full text-sm pl-5 pr-2 py-1.5 rounded border outline-none"
              style={fieldStyle} />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Date</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full text-sm px-2 py-1.5 rounded border outline-none"
          style={fieldStyle} />
      </div>

      {cost > 0 && (
        <div className="text-xs px-2 py-1.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
          Total cost: <span className="tabular-nums font-semibold" style={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}>${cost.toFixed(2)}</span>
        </div>
      )}

      <input value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full text-sm px-2 py-1.5 rounded border outline-none"
        style={{ ...fieldStyle, fontFamily: 'inherit' }} />

      {error && <p className="text-xs" style={{ color: 'var(--accent-red)' }}>{error}</p>}

      <button type="submit" disabled={saving}
        className="w-full py-2.5 rounded font-semibold text-sm transition-opacity"
        style={{ backgroundColor: 'var(--accent-cyan)', color: '#0a0e1a', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving...' : 'Log Trade'}
      </button>
    </form>
  )
}
