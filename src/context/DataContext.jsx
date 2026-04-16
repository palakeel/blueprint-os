import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const SEED_NET_WORTH = [
  {
    id: 'seed-nw-1',
    entry_date: '2026-04-01',
    accounts: {
      'Blueprint (Robinhood)': 13245,
      'Roth IRA': 11000,
      'Trading Account': 19000,
      'Robinhood Banking': 6192,
      'CEFCU Checking': 6307,
      'CEFCU Savings': 1344,
      'Crypto (Coinbase)': 37204,
      'Hyperliquid': 2000,
      'AMEX': -188,
      'Robinhood Gold': 0,
      'Coinbase One Card': 0,
    },
    total_assets: 96292,
    total_liabilities: 188,
    net_worth: 97504,
    notes: 'April 2026 baseline',
    created_at: '2026-04-01T00:00:00Z',
  },
]

const SEED_MILESTONES = [
  { id: 'seed-m1', name: 'Runway',           target_amount: 47000,    is_achieved: false },
  { id: 'seed-m2', name: 'Foundation',        target_amount: 100000,   is_achieved: false },
  { id: 'seed-m3', name: 'Freedom Starter',  target_amount: 500000,   is_achieved: false },
  { id: 'seed-m4', name: 'FI Number',         target_amount: 1175000,  is_achieved: false },
  { id: 'seed-m5', name: 'Trading FT',        target_amount: 3000000,  is_achieved: false },
  { id: 'seed-m6', name: 'Generational',      target_amount: 10000000, is_achieved: false },
]

const SEED_RECEIVABLES = [
  { id: 'seed-r1', person_name: 'Andrew', amount: 1400, description: '', created_date: '2026-03-01', is_received: false },
]

// April 15 2026 — updated to reflect actual positions (SCHD/IREN/BIDU/INFQ sold)
const SEED_PORTFOLIO = [
  { id: 'seed-p1',  ticker: 'AMZN',  shares: 10.18,     avg_cost: 203.00, target_allocation: 16, dca_biweekly: 35, account: 'Blueprint' },
  { id: 'seed-p2',  ticker: 'VOO',   shares: 4.06,      avg_cost: 595.00, target_allocation: 10, dca_biweekly: 14, account: 'Blueprint' },
  { id: 'seed-p3',  ticker: 'NOW',   shares: 27,        avg_cost: 88.56,  target_allocation: 7,  dca_biweekly: 25, account: 'Blueprint' },
  { id: 'seed-p4',  ticker: 'INTU',  shares: 6,         avg_cost: 368.33, target_allocation: 5,  dca_biweekly: 25, account: 'Blueprint' },
  { id: 'seed-p5',  ticker: 'TSLA',  shares: 4.09,      avg_cost: 350.00, target_allocation: 11, dca_biweekly: 30, account: 'Blueprint' },
  { id: 'seed-p6',  ticker: 'GOOGL', shares: 4.08,      avg_cost: 280.00, target_allocation: 10, dca_biweekly: 25, account: 'Blueprint' },
  { id: 'seed-p7',  ticker: 'META',  shares: 2.04,      avg_cost: 555.00, target_allocation: 8,  dca_biweekly: 20, account: 'Blueprint' },
  { id: 'seed-p8',  ticker: 'HOOD',  shares: 8.07,      avg_cost: 68.00,  target_allocation: 2,  dca_biweekly: 0,  account: 'Blueprint' },
  { id: 'seed-p9',  ticker: 'AMD',   shares: 2.12,      avg_cost: 198.00, target_allocation: 8,  dca_biweekly: 30, account: 'Blueprint' },
  { id: 'seed-p10', ticker: 'NBIS',  shares: 3,         avg_cost: 101.00, target_allocation: 3,  dca_biweekly: 0,  account: 'Blueprint' },
  { id: 'seed-p11', ticker: 'SMH',   shares: 0.045479,  avg_cost: 439.76, target_allocation: 8,  dca_biweekly: 35, account: 'Blueprint' },
  { id: 'seed-p12', ticker: 'NVDA',  shares: 0.102325,  avg_cost: 175.91, target_allocation: 8,  dca_biweekly: 40, account: 'Blueprint' },
  { id: 'seed-p13', ticker: 'VST',   shares: 0.08567,   avg_cost: 151.75, target_allocation: 4,  dca_biweekly: 15, account: 'Blueprint' },
]

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

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [netWorthHistory, setNetWorthHistory] = useState(SEED_NET_WORTH)
  const [budgetEntries,   setBudgetEntries]   = useState([])
  const [milestones,      setMilestones]      = useState(SEED_MILESTONES)
  const [receivables,     setReceivables]     = useState(SEED_RECEIVABLES)
  const [portfolio,       setPortfolio]       = useState(SEED_PORTFOLIO)
  const [gamification,    setGamification]    = useState(null)
  const [loading,         setLoading]         = useState(false)
  const [lastUpdated,     setLastUpdated]     = useState(new Date())

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [nwRes, budgetRes, msRes, recRes, portRes, gamRes] = await Promise.all([
        supabase.from('net_worth_entries').select('*').eq('user_id', user.id).order('entry_date', { ascending: false }),
        supabase.from('budget_entries').select('*').eq('user_id', user.id).order('week_start', { ascending: false }),
        supabase.from('milestones').select('*').eq('user_id', user.id).order('target_amount'),
        supabase.from('receivables').select('*').eq('user_id', user.id).order('created_date', { ascending: false }),
        supabase.from('portfolio_positions').select('*').eq('user_id', user.id).order('ticker'),
        supabase.from('gamification').select('*').eq('user_id', user.id).maybeSingle(),
      ])
      if (nwRes.data?.length  > 0) setNetWorthHistory(nwRes.data)
      if (budgetRes.data?.length > 0) setBudgetEntries(budgetRes.data)
      if (msRes.data?.length  > 0) setMilestones(msRes.data)
      if (recRes.data?.length > 0) setReceivables(recRes.data)
      if (portRes.data?.length > 0) setPortfolio(portRes.data)
      if (gamRes.data) setGamification(gamRes.data)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { if (user) fetchAll() }, [user, fetchAll])

  return (
    <DataContext.Provider value={{
      netWorthHistory, setNetWorthHistory,
      budgetEntries,   setBudgetEntries,
      milestones,      setMilestones,
      receivables,     setReceivables,
      portfolio,       setPortfolio,
      gamification,    setGamification,
      budgetTargets: BUDGET_TARGETS,
      latestNetWorth: netWorthHistory[0] ?? null,
      prevNetWorth:   netWorthHistory[1] ?? null,
      loading,
      lastUpdated,
      refresh: fetchAll,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
