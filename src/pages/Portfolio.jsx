import { useState, useEffect } from 'react'
import { useData, ACCOUNTS }   from '../context/DataContext'
import { useAuth }             from '../context/AuthContext'
import { AllocationChart }     from '../components/charts/AllocationChart'
import { LogTradeForm }        from '../components/forms/LogTradeForm'
import { EditPositionForm }    from '../components/forms/EditPositionForm'
import { supabase }            from '../lib/supabase'
import { formatMoney }         from '../lib/formatters'
import { Private }             from '../components/ui/Private'
import { RefreshCw, Wifi, WifiOff, Pencil, Trash2, Plus, Bitcoin, DollarSign } from 'lucide-react'

const DCA_FREQUENCIES = ['Weekly', 'Biweekly', 'Monthly', 'Quarterly']

// Multiplier relative to biweekly base (26 periods/year)
const DCA_MULTIPLIER = { weekly: 0.5, biweekly: 1, monthly: 26 / 12, quarterly: 26 / 4 }

export function Portfolio() {
  const { portfolio, setPortfolio, accountCash, setAccountCash } = useData()
  const { user } = useAuth()
  const [prices,        setPrices]       = useState({})
  const [priceStatus,   setPriceStatus]  = useState('idle')
  const [panel,         setPanel]        = useState(null)
  const [editingPos,    setEditingPos]   = useState(null)
  const [activeAccount, setActiveAccount] = useState(ACCOUNTS[0])
  const [editingCash,   setEditingCash]  = useState(false)
  const [cashInput,     setCashInput]    = useState('')
  const [savingCash,    setSavingCash]   = useState(false)
  // All positions with shares (used for price fetching — pull from all accounts)
  const allActive = portfolio.filter(p => p.shares > 0)
  // Positions scoped to the selected account tab
  const activePos = allActive.filter(p => (p.account ?? 'Blueprint') === activeAccount)
  const totalCost        = activePos.reduce((s, p) => s + p.shares * p.avg_cost, 0)
  const totalMarketValue = activePos.reduce((s, p) => {
    const lp = prices[p.ticker]?.price
    return s + p.shares * (lp > 0 ? lp : p.avg_cost)
  }, 0)

  const fetchPrices = async () => {
    if (allActive.length === 0) return
    setPriceStatus('loading')
    const tickers = allActive.map(p => p.ticker).join(',')
    try {
      const res  = await fetch(`/api/schwab/quotes?tickers=${encodeURIComponent(tickers)}`)
      const data = await res.json()
      if (res.status === 401 || data.error === 'not_connected') setPriceStatus('not_connected')
      else if (!res.ok) setPriceStatus('error')
      else { setPrices(data); setPriceStatus('connected') }
    } catch { setPriceStatus('error') }
  }

  useEffect(() => { fetchPrices() }, [allActive.length])

  const saveCash = async (freq) => {
    if (!user) return
    const balance = freq != null ? (accountCash[activeAccount]?.balance ?? 0) : (parseFloat(cashInput) || 0)
    const dca_frequency = freq ?? (accountCash[activeAccount]?.dca_frequency ?? 'biweekly')
    setSavingCash(true)
    await supabase.from('account_cash').upsert(
      { user_id: user.id, account: activeAccount, balance, dca_frequency, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,account' }
    )
    setAccountCash(prev => ({ ...prev, [activeAccount]: { balance, dca_frequency } }))
    if (freq == null) setEditingCash(false)
    setSavingCash(false)
  }

  const deletePosition = async (pos) => {
    if (!confirm(`Remove ${pos.ticker} from portfolio?`)) return
    if (user && !pos.id.startsWith('seed')) {
      await supabase.from('portfolio_positions').delete().eq('id', pos.id)
    }
    setPortfolio(prev => prev.filter(p => p.id !== pos.id))
  }

  const closePanel = () => { setPanel(null); setEditingPos(null) }

  const panelTitle = panel === 'trade' ? 'Log Trade'
    : panel === 'add'   ? 'Add Position'
    : editingPos        ? `Edit ${editingPos.ticker}`
    : ''

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Account Tabs */}
      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {[...ACCOUNTS, 'Crypto'].map(acct => (
          <button
            key={acct}
            onClick={() => { setActiveAccount(acct); setPanel(null); setEditingPos(null) }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
            style={{
              color:       activeAccount === acct ? 'var(--accent-cyan)' : 'var(--text-dim)',
              borderColor: activeAccount === acct ? 'var(--accent-cyan)' : 'transparent',
            }}>
            {acct === 'Crypto' && <Bitcoin size={12} />}
            {acct}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{activeAccount} Portfolio</h1>
            {priceStatus === 'connected' && (() => {
              const session = Object.values(prices)[0]?.session
              return session === 'regular'
                ? <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-green)' }}>☀ RH</span>
                : <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-amber)' }}>🌙 AH</span>
            })()}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="tabular-nums text-sm" style={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}>
              <Private>{formatMoney(priceStatus === 'connected' ? totalMarketValue : totalCost)}</Private>
              <span className="text-xs ml-1" style={{ color: 'var(--text-dim)' }}>
                {priceStatus === 'connected' ? 'market value' : 'cost basis'}
              </span>
            </span>
            {priceStatus === 'connected' && (
              <span className="tabular-nums text-sm" style={{ color: totalMarketValue - totalCost >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontFamily: "'JetBrains Mono', monospace" }}>
                <Private>{totalMarketValue - totalCost >= 0 ? '+' : ''}{formatMoney(totalMarketValue - totalCost)} P&L</Private>
              </span>
            )}
            {/* Cash balance */}
            {activeAccount !== 'Crypto' && (
              <span className="flex items-center gap-1.5">
                <DollarSign size={11} style={{ color: 'var(--text-dim)' }} />
                {editingCash ? (
                  <span className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="number" min="0" step="0.01"
                      value={cashInput}
                      onChange={e => setCashInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveCash(); if (e.key === 'Escape') setEditingCash(false) }}
                      className="w-24 text-sm px-2 py-0.5 rounded border outline-none tabular-nums"
                      style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--accent-cyan)', color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}
                    />
                    <button onClick={saveCash} disabled={savingCash}
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--accent-cyan)', color: '#0a0e1a' }}>
                      {savingCash ? '…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingCash(false)} className="text-xs" style={{ color: 'var(--text-dim)' }}>✕</button>
                  </span>
                ) : (
                  <button
                    onClick={() => { setCashInput(String(accountCash[activeAccount]?.balance ?? '')); setEditingCash(true) }}
                    className="tabular-nums text-sm hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
                    <Private>{(accountCash[activeAccount]?.balance ?? 0) > 0 ? formatMoney(accountCash[activeAccount].balance) : 'Add cash'}</Private>
                    <span className="text-xs ml-1" style={{ color: 'var(--text-dim)' }}>cash</span>
                  </button>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {priceStatus === 'not_connected' && (
            <a href="/api/schwab/auth" className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
              style={{ backgroundColor: 'var(--accent-amber)', color: '#0a0e1a' }}>
              <WifiOff size={12} /> Connect Schwab
            </a>
          )}
          {priceStatus === 'connected' && (
            <button onClick={fetchPrices} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border"
              style={{ color: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}>
              <Wifi size={12} /> Live <RefreshCw size={11} />
            </button>
          )}
          {priceStatus === 'loading' && <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Fetching prices...</span>}
          {priceStatus === 'error'   && (
            <button onClick={fetchPrices} className="text-xs px-2 py-1 rounded border"
              style={{ color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}>Retry</button>
          )}
          <button onClick={() => { setPanel('trade'); setEditingPos(null) }}
            className="px-3 py-1.5 rounded text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--accent-cyan)', color: '#0a0e1a' }}>
            + Log Trade
          </button>
          <button onClick={() => { setPanel('add'); setEditingPos(null) }}
            className="px-3 py-1.5 rounded text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--accent-blue)', color: 'white' }}>
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Crypto placeholder */}
      {activeAccount === 'Crypto' && (
        <div className="rounded-lg border p-10 flex flex-col items-center justify-center gap-3 text-center"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <Bitcoin size={32} style={{ color: 'var(--accent-amber)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Crypto Portfolio</p>
          <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            Live crypto positions coming soon. Prices powered by CoinGecko.
            Add your holdings once the tracker is wired up.
          </p>
        </div>
      )}

      {/* Holdings Table + Side Panel */}
      {activeAccount !== 'Crypto' && <div className={`grid gap-6 ${panel || editingPos ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>
        <div className={`rounded-lg border overflow-hidden ${panel || editingPos ? 'md:col-span-2' : ''}`}
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="px-5 py-3 border-b text-xs font-semibold uppercase tracking-wider"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Holdings</div>
          {activePos.length === 0 && !panel && !editingPos && (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <p className="text-sm" style={{ color: 'var(--text-dim)' }}>No positions in {activeAccount}</p>
              <button
                onClick={() => { setPanel('add'); setEditingPos(null) }}
                className="text-xs px-3 py-1.5 rounded border transition-opacity hover:opacity-70"
                style={{ color: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}>
                + Add Position
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs" style={{ color: 'var(--text-dim)', backgroundColor: 'var(--bg-tertiary)' }}>
                  <th className="text-left px-4 py-3 font-medium">Ticker</th>
                  <th className="text-right px-4 py-3 font-medium">Shares</th>
                  <th className="text-right px-4 py-3 font-medium">Avg Cost</th>
                  {priceStatus === 'connected' && <th className="text-right px-4 py-3 font-medium">Price</th>}
                  <th className="text-right px-4 py-3 font-medium">{priceStatus === 'connected' ? 'Mkt Value' : 'Cost Basis'}</th>
                  {priceStatus === 'connected' && <th className="text-right px-4 py-3 font-medium">P&L</th>}
                  <th className="text-right px-4 py-3 font-medium">Alloc</th>
                  <th className="text-right px-4 py-3 font-medium">Target</th>
                  <th className="text-right px-4 py-3 font-medium">DCA/2wk</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {activePos.map(pos => {
                  const costBasis   = pos.shares * pos.avg_cost
                  const livePrice   = prices[pos.ticker]?.price
                  const mktValue    = livePrice ? pos.shares * livePrice : costBasis
                  const pnl         = livePrice ? mktValue - costBasis : null
                  const pnlPct      = pnl != null ? (pnl / costBasis) * 100 : null
                  const baseValue   = priceStatus === 'connected' ? totalMarketValue : totalCost
                  const alloc       = baseValue > 0 ? (mktValue / baseValue) * 100 : 0
                  const diff        = alloc - (pos.target_allocation ?? 0)
                  const diffColor   = Math.abs(diff) <= 3 ? 'var(--accent-green)' : Math.abs(diff) <= 8 ? 'var(--accent-amber)' : 'var(--accent-red)'
                  return (
                    <tr key={pos.id} className="border-t text-sm group" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-4 py-3 font-bold" style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {pos.ticker}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                        <Private>{pos.shares}</Private>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
                        <Private>{formatMoney(pos.avg_cost, 2)}</Private>
                      </td>
                      {priceStatus === 'connected' && (
                        <td className="px-4 py-3 text-right tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          <div style={{ color: 'var(--text-primary)' }}><Private>{livePrice ? formatMoney(livePrice, 2) : '—'}</Private></div>
                          {prices[pos.ticker] && (
                            <div className="text-xs" style={{ color: prices[pos.ticker].changePercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                              <Private>{prices[pos.ticker].changePercent >= 0 ? '+' : ''}{prices[pos.ticker].changePercent.toFixed(2)}%</Private>
                            </div>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                        <Private>{formatMoney(mktValue)}</Private>
                      </td>
                      {priceStatus === 'connected' && (
                        <td className="px-4 py-3 text-right tabular-nums" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {pnl != null ? (
                            <>
                              <div style={{ color: pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                <Private>{pnl >= 0 ? '+' : ''}{formatMoney(pnl)}</Private>
                              </div>
                              <div className="text-xs" style={{ color: pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                <Private>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%</Private>
                              </div>
                            </>
                          ) : '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: diffColor, fontFamily: "'JetBrains Mono', monospace" }}>
                        {alloc.toFixed(1)}%
                        <span className="text-xs ml-1" style={{ color: 'var(--text-dim)' }}>
                          ({diff >= 0 ? '+' : ''}{diff.toFixed(1)})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {pos.target_allocation ?? '—'}%
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--accent-amber)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {pos.dca_biweekly ? `$${pos.dca_biweekly}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingPos(pos); setPanel(null) }}
                            className="p-1 rounded hover:opacity-70" style={{ color: 'var(--accent-cyan)' }}>
                            <Pencil size={11} />
                          </button>
                          <button onClick={() => deletePosition(pos)}
                            className="p-1 rounded hover:opacity-70" style={{ color: 'var(--accent-red)' }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panel */}
        {(panel || editingPos) && (
          <div className="rounded-lg border p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{panelTitle}</h2>
              <button onClick={closePanel} className="text-xs hover:opacity-70" style={{ color: 'var(--text-dim)' }}>✕</button>
            </div>
            {panel === 'trade' && <LogTradeForm account={activeAccount} onSuccess={closePanel} />}
            {panel === 'add'   && <EditPositionForm defaultAccount={activeAccount} onSuccess={closePanel} />}
            {editingPos        && <EditPositionForm position={editingPos} onSuccess={closePanel} />}
          </div>
        )}
      </div>}

      {/* DCA Tracker + Allocation Chart */}
      {activeAccount !== 'Crypto' && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>DCA Plan</h2>
          {/* Per-position allocations */}
          {(() => {
            const freq = (accountCash[activeAccount]?.dca_frequency ?? 'biweekly').toLowerCase()
            const mult = DCA_MULTIPLIER[freq] ?? 1
            const dcaPositions = activePos.filter(p => p.dca_biweekly)
            const total = dcaPositions.reduce((s, p) => s + (p.dca_biweekly ?? 0), 0) * mult
            return (
              <div className="space-y-2 mb-4">
                {dcaPositions.length === 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    No DCA set — edit a position to add an allocation.
                  </p>
                )}
                {dcaPositions.map(pos => (
                  <div key={pos.id} className="flex justify-between items-center text-xs">
                    <span style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}>{pos.ticker}</span>
                    <span className="tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatMoney(pos.dca_biweekly * mult)}
                    </span>
                  </div>
                ))}
                {dcaPositions.length > 0 && (
                  <div className="border-t pt-2 flex justify-between text-sm font-semibold" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total</span>
                    <span className="tabular-nums" style={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatMoney(total)}/period
                    </span>
                  </div>
                )}
              </div>
            )
          })()}
          {/* Frequency selector */}
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-dim)' }}>Frequency</p>
            <div className="flex flex-wrap gap-1.5">
              {DCA_FREQUENCIES.map(f => {
                const active = (accountCash[activeAccount]?.dca_frequency ?? 'biweekly').toLowerCase() === f.toLowerCase()
                return (
                  <button
                    key={f}
                    onClick={() => saveCash(f.toLowerCase())}
                    className="px-2.5 py-1 rounded text-xs font-medium transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: active ? 'var(--accent-amber)' : 'var(--bg-tertiary)',
                      color:           active ? '#0a0e1a' : 'var(--text-secondary)',
                      border:          active ? 'none' : '1px solid var(--border)',
                    }}>
                    {f}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="md:col-span-2 rounded-lg border p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Allocation vs Target</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>
            {priceStatus === 'connected' ? 'Based on live market value' : 'Based on cost basis (no live prices)'}
          </p>
          <AllocationChart portfolio={portfolio} prices={priceStatus === 'connected' ? prices : {}} />
        </div>
      </div>}
    </div>
  )
}
