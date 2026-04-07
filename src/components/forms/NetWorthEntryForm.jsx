import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatMoney } from '../../lib/formatters'

const ASSET_ACCOUNTS = [
  'Blueprint (Robinhood)',
  'Roth IRA',
  'Trading Account',
  'RH Bank Savings',
  'CEFCU Checking',
  'CEFCU Savings',
  'Crypto (Coinbase)',
  'Hyperliquid',
]

const LIABILITY_ACCOUNTS = ['AMEX balance']

const fieldStyle = {
  backgroundColor: 'var(--bg-primary)',
  borderColor: 'var(--border)',
  color: 'var(--text-primary)',
  fontFamily: "'JetBrains Mono', monospace",
}

export function NetWorthEntryForm({ onSuccess }) {
  const { user } = useAuth()
  const { netWorthHistory, setNetWorthHistory } = useData()
  const latest = netWorthHistory[0]

  const [assets, setAssets] = useState(
    Object.fromEntries(ASSET_ACCOUNTS.map(a => [a, latest?.accounts?.[a] > 0 ? String(latest.accounts[a]) : '']))
  )
  const [liabilities, setLiabilities] = useState(
    Object.fromEntries(LIABILITY_ACCOUNTS.map(l => [l, latest?.accounts?.[l] < 0 ? String(Math.abs(latest.accounts[l])) : '']))
  )
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const totalAssets      = ASSET_ACCOUNTS.reduce((s, a) => s + (parseFloat(assets[a]) || 0), 0)
  const totalLiabilities = LIABILITY_ACCOUNTS.reduce((s, l) => s + (parseFloat(liabilities[l]) || 0), 0)
  const netWorth         = totalAssets - totalLiabilities

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const accountMap = {}
    for (const a of ASSET_ACCOUNTS)      accountMap[a] = parseFloat(assets[a]) || 0
    for (const l of LIABILITY_ACCOUNTS)  accountMap[l] = -(parseFloat(liabilities[l]) || 0)

    const entry = {
      user_id:            user?.id,
      entry_date:         entryDate,
      accounts:           accountMap,
      total_assets:       totalAssets,
      total_liabilities:  totalLiabilities,
      net_worth:          netWorth,
      notes,
    }

    try {
      if (user) {
        const { data, error: err } = await supabase.from('net_worth_entries').insert(entry).select().single()
        if (err) throw err
        setNetWorthHistory(prev => [data, ...prev.filter(e => !e.id.startsWith('seed'))])
      } else {
        setNetWorthHistory(prev => [{ ...entry, id: `local-${Date.now()}`, created_at: new Date().toISOString() }, ...prev])
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
      <div className="flex items-center gap-3">
        <label className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>Date</label>
        <input
          type="date"
          value={entryDate}
          onChange={e => setEntryDate(e.target.value)}
          className="text-sm px-2 py-1.5 rounded border outline-none"
          style={fieldStyle}
        />
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent-green)' }}>
          Assets
        </div>
        <div className="space-y-2">
          {ASSET_ACCOUNTS.map(account => (
            <div key={account} className="flex items-center gap-3">
              <label className="flex-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{account}</label>
              <div className="relative w-32">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-dim)' }}>$</span>
                <input
                  type="number"
                  value={assets[account]}
                  onChange={e => setAssets(a => ({ ...a, [account]: e.target.value }))}
                  placeholder="0"
                  step="0.01"
                  min="0"
                  className="w-full text-right text-sm pl-5 pr-2 py-1.5 rounded border outline-none"
                  style={fieldStyle}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent-red)' }}>
          Liabilities
        </div>
        <div className="space-y-2">
          {LIABILITY_ACCOUNTS.map(item => (
            <div key={item} className="flex items-center gap-3">
              <label className="flex-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{item}</label>
              <div className="relative w-32">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-dim)' }}>$</span>
                <input
                  type="number"
                  value={liabilities[item]}
                  onChange={e => setLiabilities(l => ({ ...l, [item]: e.target.value }))}
                  placeholder="0"
                  step="0.01"
                  min="0"
                  className="w-full text-right text-sm pl-5 pr-2 py-1.5 rounded border outline-none"
                  style={fieldStyle}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-3 space-y-1.5" style={{ borderColor: 'var(--border)' }}>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--text-secondary)' }}>Total Assets</span>
          <span className="tabular-nums" style={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}>
            {formatMoney(totalAssets)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--text-secondary)' }}>Total Liabilities</span>
          <span className="tabular-nums" style={{ color: 'var(--accent-red)', fontFamily: "'JetBrains Mono', monospace" }}>
            -{formatMoney(totalLiabilities)}
          </span>
        </div>
        <div className="flex justify-between text-base font-bold border-t pt-2" style={{ borderColor: 'var(--border)' }}>
          <span style={{ color: 'var(--text-primary)' }}>Net Worth</span>
          <span className="tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
            {formatMoney(netWorth)}
          </span>
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
        style={{ backgroundColor: 'var(--accent-green)', color: '#0a0e1a', opacity: saving ? 0.7 : 1 }}
      >
        {saving ? 'Saving...' : 'Save Net Worth Entry'}
      </button>
    </form>
  )
}
