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

export function LogTradeForm({ account, onSuccess }) {
  const { user } = useAuth()
  const { portfolio, setPortfolio } = useData()

  // Only show tickers from the active account (or all if account not specified)
  const tickers = portfolio
    .filter(p => !account || p.account === account)
    .map(p => p.ticker)

  const [ticker,  setTicker]  = useState(tickers[0] ?? '')
  const [type,    setType]    = useState('DCA')
  const [shares,  setShares]  = useState('')
  const [price,   setPrice]   = useState('')
  const [date,    setDate]    = useState(localDateString())
  const [notes,   setNotes]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const isSell     = type === 'Sell'
  const sharesNum  = parseFloat(shares) || 0
  const priceNum   = parseFloat(price)  || 0
  const totalValue = sharesNum * priceNum

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    if (!sharesNum || !priceNum) { setError('Shares and price are required'); setSaving(false); return }

    const pos = portfolio.find(p => p.ticker === ticker)
    if (!pos) { setError('Ticker not found'); setSaving(false); return }

    const oldShares = parseFloat(pos.shares) || 0

    // Validate sell
    if (isSell && sharesNum > oldShares) {
      setError(`Can't sell ${sharesNum} — only ${oldShares.toFixed(4)} shares held`)
      setSaving(false)
      return
    }

    // Shares delta: positive for buys, negative for sells
    const delta     = isSell ? -sharesNum : sharesNum
    const newShares = parseFloat((oldShares + delta).toFixed(4))

    // Avg cost: unchanged on sell (FIFO basis — remaining shares keep same avg)
    // Recalculate weighted avg only on buys
    const newAvg = isSell
      ? pos.avg_cost
      : newShares > 0
        ? (oldShares * (parseFloat(pos.avg_cost) || 0) + sharesNum * priceNum) / newShares
        : priceNum

    try {
      if (user) {
        await supabase.from('trade_history').insert({
          user_id:    user.id,
          ticker,
          trade_type: type,
          shares:     sharesNum,   // always positive; trade_type indicates direction
          price:      priceNum,
          total_cost: totalValue,
          trade_date: date,
          notes:      notes || null,
          account:    pos.account ?? account ?? 'Blueprint',
        })

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
            style={{ ...fieldStyle, color: isSell ? 'var(--accent-red)' : 'var(--accent-green)' }}>
            <option value="DCA">DCA</option>
            <option value="Limit Fill">Limit Fill</option>
            <option value="Manual Buy">Manual Buy</option>
            <option value="Sell">Sell</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Shares</label>
          <input type="number" value={shares} onChange={e => setShares(e.target.value)}
            placeholder="0.0000" step="0.0001" min="0" required
            className="w-full text-sm px-2 py-1.5 rounded border outline-none"
            style={fieldStyle} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            {isSell ? 'Sale Price' : 'Fill Price'}
          </label>
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

      {totalValue > 0 && (
        <div className="text-xs px-2 py-1.5 rounded flex justify-between" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
          <span>{isSell ? 'Proceeds' : 'Total cost'}</span>
          <span className="tabular-nums font-semibold"
            style={{ color: isSell ? 'var(--accent-amber)' : 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}>
            ${totalValue.toFixed(2)}
          </span>
        </div>
      )}

      {/* Show remaining shares on sell */}
      {isSell && sharesNum > 0 && (() => {
        const pos = portfolio.find(p => p.ticker === ticker)
        const remaining = (parseFloat(pos?.shares) || 0) - sharesNum
        return (
          <div className="text-xs px-2 py-1.5 rounded flex justify-between" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            <span>Remaining shares</span>
            <span className="tabular-nums font-semibold"
              style={{ color: remaining < 0 ? 'var(--accent-red)' : 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
              {remaining.toFixed(4)}
            </span>
          </div>
        )
      })()}

      <input value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full text-sm px-2 py-1.5 rounded border outline-none"
        style={{ ...fieldStyle, fontFamily: 'inherit' }} />

      {error && <p className="text-xs" style={{ color: 'var(--accent-red)' }}>{error}</p>}

      <button type="submit" disabled={saving}
        className="w-full py-2.5 rounded font-semibold text-sm transition-opacity"
        style={{
          backgroundColor: isSell ? 'var(--accent-red)' : 'var(--accent-cyan)',
          color: '#0a0e1a',
          opacity: saving ? 0.7 : 1,
        }}>
        {saving ? 'Saving...' : isSell ? 'Log Sell' : 'Log Trade'}
      </button>
    </form>
  )
}
