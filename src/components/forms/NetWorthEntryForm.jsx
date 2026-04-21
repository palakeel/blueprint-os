import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatMoney, localDateString } from '../../lib/formatters'
import { processNetWorthSave } from '../../lib/gamificationActions'
import { useToast }            from '../../context/ToastContext'
import { BADGE_DEFINITIONS }   from '../../lib/gamification'
import { RefreshCw }           from 'lucide-react'

const ASSET_ACCOUNTS = [
  'Blueprint (Robinhood)',
  'Roth IRA',
  'Trading Account',
  'Robinhood Banking',
  'CEFCU Checking',
  'CEFCU Savings',
  'Crypto (Coinbase)',
]

const LIABILITY_ACCOUNTS = ['AMEX', 'Robinhood Gold', 'Coinbase One Card']

// Maps form account labels → portfolio account names in DataContext
const PORTFOLIO_ACCOUNT_MAP = {
  'Blueprint (Robinhood)': 'Blueprint',
  'Roth IRA':              'Roth IRA',
  'Trading Account':       'Trading',
  'Crypto (Coinbase)':     'Crypto',
}

const fieldStyle = {
  backgroundColor: 'var(--bg-primary)',
  borderColor: 'var(--border)',
  color: 'var(--text-primary)',
  fontFamily: "'JetBrains Mono', monospace",
}

export function NetWorthEntryForm({ entry, onSuccess }) {
  const { user } = useAuth()
  const { netWorthHistory, setNetWorthHistory, gamification, setGamification, portfolio, accountCash, marketPrices } = useData()
  const { addToast } = useToast()
  const latest = netWorthHistory[0]

  const isEdit = !!entry

  const getPortfolioValue = useCallback((portAcct) => {
    const posVal = portfolio
      .filter(p => (p.account ?? 'Blueprint') === portAcct && p.shares > 0)
      .reduce((s, p) => s + p.shares * (marketPrices[p.ticker.toUpperCase()] ?? p.avg_cost), 0)
    return posVal + (accountCash[portAcct]?.balance ?? 0)
  }, [portfolio, accountCash, marketPrices])

  const initAssets = useCallback(() =>
    Object.fromEntries(ASSET_ACCOUNTS.map(a => {
      if (isEdit) return [a, entry.accounts?.[a] > 0 ? String(entry.accounts[a]) : '']
      const portAcct = PORTFOLIO_ACCOUNT_MAP[a]
      if (portAcct) {
        const live = getPortfolioValue(portAcct)
        return [a, live > 0 ? String(live.toFixed(2)) : '']
      }
      return [a, latest?.accounts?.[a] > 0 ? String(latest.accounts[a]) : '']
    }))
  , [isEdit, entry, latest, getPortfolioValue])

  const [assets, setAssets] = useState(() => initAssets())
  const [synced, setSynced] = useState(false)

  // Auto-sync once portfolio data arrives (it loads async after mount)
  useEffect(() => {
    if (!isEdit && !synced && portfolio.length > 0) {
      setAssets(initAssets())
      setSynced(true)
    }
  }, [isEdit, synced, portfolio, initAssets])

  const [liabilities, setLiabilities] = useState(
    Object.fromEntries(LIABILITY_ACCOUNTS.map(l => {
      if (isEdit) return [l, entry.accounts?.[l] < 0 ? String(Math.abs(entry.accounts[l])) : '']
      return [l, latest?.accounts?.[l] < 0 ? String(Math.abs(latest.accounts[l])) : '']
    }))
  )
  const [entryDate, setEntryDate] = useState(isEdit ? entry.entry_date : localDateString())
  const [notes, setNotes] = useState(isEdit ? (entry.notes ?? '') : '')
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

    const dbEntry = {
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
        if (isEdit) {
          const { data, error: err } = await supabase
            .from('net_worth_entries').update(dbEntry).eq('id', entry.id).select().single()
          if (err) throw err
          setNetWorthHistory(prev => prev.map(e => e.id === entry.id ? data : e))
        } else {
          const { data, error: err } = await supabase.from('net_worth_entries').insert(dbEntry).select().single()
          if (err) throw err
          setNetWorthHistory(prev => [data, ...prev.filter(e => !e.id.startsWith('seed'))])
          processNetWorthSave(user, gamification, { netWorth })
            .then(result => {
              if (result?.updated) setGamification(result.updated)
              for (const badge of result?.newBadges ?? []) {
                const def = BADGE_DEFINITIONS.find(b => b.id === badge.id)
                if (def) addToast({ icon: def.icon, title: 'Achievement Unlocked!', message: def.name })
              }
            })
        }
      } else {
        const local = { ...dbEntry, id: isEdit ? entry.id : `local-${Date.now()}`, created_at: new Date().toISOString() }
        setNetWorthHistory(prev => isEdit ? prev.map(e => e.id === entry.id ? local : e) : [local, ...prev.filter(e => !e.id.startsWith('seed'))])
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
        {isEdit && <span className="ml-auto px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: 'var(--accent-amber)', color: '#0a0e1a' }}>EDITING</span>}
        <input
          type="date"
          value={entryDate}
          onChange={e => setEntryDate(e.target.value)}
          className="text-sm px-2 py-1.5 rounded border outline-none"
          style={fieldStyle}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-green)' }}>
            Assets
          </div>
          <button
            type="button"
            onClick={() => setAssets(initAssets())}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded transition-opacity hover:opacity-80"
            style={{ color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)' }}
          >
            <RefreshCw size={10} />
            Sync Portfolio
          </button>
        </div>
        <div className="space-y-2">
          {ASSET_ACCOUNTS.map(account => {
            const isLive = !isEdit && !!PORTFOLIO_ACCOUNT_MAP[account]
            return (
            <div key={account} className="flex items-center gap-3">
              <label className="flex-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {account}
                {isLive && <span className="ml-1.5 text-[9px] px-1 py-px rounded" style={{ backgroundColor: 'rgba(0,170,255,0.12)', color: 'var(--accent-blue)' }}>LIVE</span>}
              </label>
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
                  style={isLive ? { ...fieldStyle, borderColor: 'rgba(0,170,255,0.35)' } : fieldStyle}
                />
              </div>
            </div>
            )
          })}
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
        {saving ? 'Saving...' : isEdit ? 'Update Entry' : 'Save Net Worth Entry'}
      </button>
    </form>
  )
}
