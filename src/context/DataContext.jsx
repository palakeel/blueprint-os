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

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [netWorthHistory, setNetWorthHistory] = useState([])
  const [budgetEntries,   setBudgetEntries]   = useState([])
  const [milestones,      setMilestones]      = useState([])
  const [receivables,     setReceivables]     = useState([])
  const [portfolio,       setPortfolio]       = useState([])
  const [accountCash,     setAccountCash]     = useState({})  // { Blueprint: 0, 'Roth IRA': 0, Trading: 0 }
  const [gamification,    setGamification]    = useState(null)
  const [loading,         setLoading]         = useState(false)
  const [lastUpdated,     setLastUpdated]     = useState(new Date())

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

  return (
    <DataContext.Provider value={{
      netWorthHistory, setNetWorthHistory,
      budgetEntries,   setBudgetEntries,
      milestones,      setMilestones,
      receivables,     setReceivables,
      portfolio,       setPortfolio,
      accountCash,     setAccountCash,
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
