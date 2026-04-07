import { useState, useEffect } from 'react'
import { useData }          from '../context/DataContext'
import { useAuth }          from '../context/AuthContext'
import { AllocationChart }  from '../components/charts/AllocationChart'
import { supabase }         from '../lib/supabase'
import { formatMoney, formatDate } from '../lib/formatters'
import { CheckCircle, Clock } from 'lucide-react'

function getDCAPeriod() {
  const now    = new Date()
  const origin = new Date('2026-01-05') // First Monday of 2026
  const days   = Math.floor((now - origin) / 86400000)
  const period = Math.floor(days / 14)
  const start  = new Date(origin)
  start.setDate(start.getDate() + period * 14)
  const end = new Date(start)
  end.setDate(end.getDate() + 13)
  return {
    key:   start.toISOString().split('T')[0],
    label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
  }
}

export function Portfolio() {
  const { portfolio, gamification, setGamification } = useData()
  const { user } = useAuth()
  const [dcaConfirmed, setDcaConfirmed] = useState(false)
  const [confirming,   setConfirming]   = useState(false)

  const period        = getDCAPeriod()
  const totalCost     = portfolio.reduce((s, p) => s + p.shares * p.avg_cost, 0)
  const totalDCA      = portfolio.reduce((s, p) => s + (p.dca_biweekly ?? 0), 0)
  const activePos     = portfolio.filter(p => p.shares > 0)
  const limitOrders   = portfolio.filter(p => p.shares === 0 || (p.notes ?? '').toLowerCase().includes('limit'))

  // Check if current period is already confirmed
  useEffect(() => {
    if (!user) return
    supabase
      .from('dca_confirmations')
      .select('id')
      .eq('user_id', user.id)
      .eq('period_start', period.key)
      .maybeSingle()
      .then(({ data }) => setDcaConfirmed(!!data))
  }, [user, period.key])

  const confirmDCA = async () => {
    if (!user || dcaConfirmed) return
    setConfirming(true)
    await supabase.from('dca_confirmations').insert({
      user_id:      user.id,
      period_start: period.key,
      all_fired:    true,
    })
    // Update gamification dcaConfirmed flag for this week
    if (gamification) {
      const updated = {
        ...gamification,
        weekly_scores: { ...(gamification.weekly_scores ?? {}), dcaConfirmed: true },
      }
      await supabase.from('gamification').update({ weekly_scores: updated.weekly_scores }).eq('user_id', user.id)
      setGamification(updated)
    }
    setDcaConfirmed(true)
    setConfirming(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Blueprint Portfolio</h1>
        <span className="tabular-nums text-sm" style={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}>
          {formatMoney(totalCost)} cost basis
        </span>
      </div>

      {/* Holdings Table */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3 border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          Holdings
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs" style={{ color: 'var(--text-dim)', backgroundColor: 'var(--bg-tertiary)' }}>
                <th className="text-left px-4 py-3 font-medium">Ticker</th>
                <th className="text-right px-4 py-3 font-medium">Shares</th>
                <th className="text-right px-4 py-3 font-medium">Avg Cost</th>
                <th className="text-right px-4 py-3 font-medium">Cost Basis</th>
                <th className="text-right px-4 py-3 font-medium">Cost Alloc</th>
                <th className="text-right px-4 py-3 font-medium">Target</th>
                <th className="text-right px-4 py-3 font-medium">DCA/2wk</th>
              </tr>
            </thead>
            <tbody>
              {activePos.map(pos => {
                const costBasis   = pos.shares * pos.avg_cost
                const costAlloc   = totalCost > 0 ? (costBasis / totalCost) * 100 : 0
                const diff        = costAlloc - (pos.target_allocation ?? 0)
                const diffColor   = Math.abs(diff) <= 3 ? 'var(--accent-green)' : Math.abs(diff) <= 8 ? 'var(--accent-amber)' : 'var(--accent-red)'
                return (
                  <tr key={pos.id} className="border-t text-sm" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 font-bold" style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {pos.ticker}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {pos.shares}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatMoney(pos.avg_cost, 2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatMoney(costBasis)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: diffColor, fontFamily: "'JetBrains Mono', monospace" }}>
                      {costAlloc.toFixed(1)}%
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DCA Tracker + Allocation Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DCA Tracker */}
        <div className="rounded-lg border p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>DCA Tracker</h2>
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
              <Clock size={11} /> {period.label}
            </span>
          </div>

          <div className="space-y-2 mb-4">
            {portfolio.filter(p => p.dca_biweekly).map(pos => (
              <div key={pos.id} className="flex justify-between items-center text-xs">
                <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {pos.ticker}
                </span>
                <span className="tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                  ${pos.dca_biweekly}
                </span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between text-sm font-semibold" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total</span>
              <span className="tabular-nums" style={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}>
                ${totalDCA}/period
              </span>
            </div>
          </div>

          <button
            onClick={confirmDCA}
            disabled={dcaConfirmed || confirming || !user}
            className="w-full py-2 rounded text-sm font-medium flex items-center justify-center gap-2 transition-opacity"
            style={{
              backgroundColor: dcaConfirmed ? 'var(--bg-tertiary)' : 'var(--accent-green)',
              color:           dcaConfirmed ? 'var(--accent-green)' : '#0a0e1a',
              opacity:         (confirming || !user) ? 0.6 : 1,
              border:          dcaConfirmed ? '1px solid var(--accent-green)' : 'none',
            }}
          >
            {dcaConfirmed
              ? <><CheckCircle size={14} /> DCA Confirmed</>
              : confirming ? 'Confirming...' : 'Confirm Period DCA Fired'
            }
          </button>
          {!user && (
            <p className="text-xs text-center mt-2" style={{ color: 'var(--text-dim)' }}>Sign in to track DCA</p>
          )}
        </div>

        {/* Allocation Chart */}
        <div className="rounded-lg border p-5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Allocation vs Target</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>Based on cost basis (no live prices)</p>
          <AllocationChart portfolio={portfolio} />
        </div>
      </div>

      {/* Limit Orders */}
      {limitOrders.length > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Watchlist / Limit Orders</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>Informational — positions not yet entered</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs" style={{ color: 'var(--text-dim)', backgroundColor: 'var(--bg-tertiary)' }}>
                  <th className="text-left px-4 py-3 font-medium">Ticker</th>
                  <th className="text-right px-4 py-3 font-medium">Target Alloc</th>
                  <th className="text-right px-4 py-3 font-medium">DCA/2wk</th>
                  <th className="text-left px-4 py-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {limitOrders.map(pos => (
                  <tr key={pos.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3 font-bold" style={{ color: 'var(--accent-amber)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {pos.ticker}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>
                      {pos.target_allocation ? `${pos.target_allocation}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: 'var(--accent-amber)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {pos.dca_biweekly ? `$${pos.dca_biweekly}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-dim)' }}>
                      {pos.notes ?? ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
