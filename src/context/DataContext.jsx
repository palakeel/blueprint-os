import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export const ACCOUNTS = ['Blueprint', 'Roth IRA', 'Trading']

export const BUDGET_TARGETS = {
  'Food & Dining':     100,
  'Groceries':         180,
  'Transport':         30,
  'Shopping':          65,
  'Entertainment':     50,
  'Health & Personal': 45,
  'Travel':            40,
  'Miscellaneous':     40,
}

const DataContext = createContext(null)

const CRYPTO_IDS = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot',
  DOGE: 'dogecoin', LINK: 'chainlink', MATIC: 'matic-network', UNI: 'uniswap',
  ATOM: 'cosmos', LTC: 'litecoin', BCH: 'bitcoin-cash', NEAR: 'near',
  APT: 'aptos', ARB: 'arbitrum', OP: 'optimism', SUI: 'sui',
  TON: 'the-open-network', PEPE: 'pepe', SHIB: 'shiba-inu',
  HYPE: 'hyperliquid',
}

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [netWorthHistory, setNetWorthHistory] = useState([])
  const [budgetEntries,   setBudgetEntries]   = useState([])
  const [milestones,      setMilestones]      = useState([])
  const [receivables,     setReceivables]     = useState([])
  const [portfolio,       setPortfolio]       = useState([])
  const [accountCash,     setAccountCash]     = useState({})  // { Blueprint: 0, 'Roth IRA': 0, Trading: 0 }
  const [gamification,    setGamification]    = useState(null)
  const [marketPrices,    setMarketPrices]    = useState({}) // { TICKER: price }
  const [loading,         setLoading]         = useState(false)
  const [lastUpdated,     setLastUpdated]     = useState(new Date())
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [nwRes, budgetRes, msRes, recRes, portRes, cashRes, gamRes] = await Promise.all([
        supabase.from('net_worth_entries').select('*').eq('user_id', user.id).order('entry_date', { ascending: false }),
        supabase.from('budget_entries').select('*').eq('user_id', user.id).order('week_start', { ascending: false }),
        supabase.from('milestones').select('*').eq('user_id', user.id).order('target_amount'),
        supabase.from('receivables').select('*').eq('user_id', user.id).order('created_date', { ascending: false }),
        supabase.from('portfolio_positions').select('*').eq('user_id', user.id).order('ticker'),
        supabase.from('account_cash').select('*').eq('user_id', user.id),
        supabase.from('gamification').select('*').eq('user_id', user.id).maybeSingle(),
      ])
      if (nwRes.data)    setNetWorthHistory(nwRes.data)
      if (budgetRes.data) setBudgetEntries(budgetRes.data)
      if (msRes.data)    setMilestones(msRes.data)
      if (recRes.data)   setReceivables(recRes.data)
      if (portRes.data)  setPortfolio(portRes.data)
      if (cashRes.data)  setAccountCash(Object.fromEntries(cashRes.data.map(r => [r.account, { balance: r.balance, dca_frequency: r.dca_frequency ?? 'biweekly' }])))
      if (gamRes.data)   setGamification(gamRes.data)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { if (user) fetchAll() }, [user, fetchAll])

  // Fetch all market prices (stocks + crypto) — runs on load and every 5 min
  const fetchMarketPrices = useCallback(async () => {
    if (portfolio.length === 0) return
    const activePos = portfolio.filter(p => p.shares > 0)
    const cryptoAccounts = new Set(['Crypto', 'Hyperliquid'])
    const cryptoPos = activePos.filter(p => cryptoAccounts.has(p.account))
    const stockPos  = activePos.filter(p => !cryptoAccounts.has(p.account) && (p.account ?? 'Blueprint') !== 'Crypto')
    const next = {}

    // Stock prices via Schwab
    if (stockPos.length > 0) {
      try {
        const tickers = stockPos.map(p => p.ticker).join(',')
        const res = await fetch(`/api/schwab/quotes?tickers=${encodeURIComponent(tickers)}`)
        const data = await res.json()
        if (res.ok && !data.error) {
          for (const [ticker, info] of Object.entries(data)) {
            if (info?.price) next[ticker.toUpperCase()] = info.price
          }
        }
      } catch { /* stock prices unavailable */ }
    }

    // Crypto prices via CoinGecko
    if (cryptoPos.length > 0) {
      try {
        const ids = cryptoPos.map(p => CRYPTO_IDS[p.ticker.toUpperCase()] ?? p.ticker.toLowerCase()).join(',')
        const res  = await fetch(`/api/coingecko/prices?ids=${encodeURIComponent(ids)}`)
        const data = await res.json()
        if (res.ok) {
          for (const pos of cryptoPos) {
            const id = CRYPTO_IDS[pos.ticker.toUpperCase()] ?? pos.ticker.toLowerCase()
            if (data[id]?.usd) next[pos.ticker.toUpperCase()] = data[id].usd
          }
        }
      } catch { /* crypto prices unavailable */ }
    }

    if (Object.keys(next).length > 0) {
      setMarketPrices(prev => ({ ...prev, ...next }))
      setLastPriceUpdate(new Date())
    }
  }, [portfolio])

  // Fetch prices on portfolio load and refresh every 5 minutes
  useEffect(() => {
    fetchMarketPrices()
    const id = setInterval(fetchMarketPrices, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [fetchMarketPrices])

  return (
    <DataContext.Provider value={{
      netWorthHistory, setNetWorthHistory,
      budgetEntries,   setBudgetEntries,
      milestones,      setMilestones,
      receivables,     setReceivables,
      portfolio,       setPortfolio,
      accountCash,     setAccountCash,
      gamification,    setGamification,
      marketPrices,    setMarketPrices,
      budgetTargets: BUDGET_TARGETS,
      latestNetWorth: netWorthHistory[0] ?? null,
      prevNetWorth:   netWorthHistory[1] ?? null,
      loading,
      lastUpdated,
      lastPriceUpdate,
      refresh: fetchAll,
      refreshPrices: fetchMarketPrices,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
