import { useData } from '../context/DataContext'

// Investment accounts tracked live via portfolio positions + cash
const INVESTMENT_ACCOUNTS = ['Blueprint', 'Roth IRA', 'Trading']

// All key variants these accounts might appear as in an old snapshot
// (prevents stale snapshot values leaking through alongside live data)
const INVESTMENT_SNAPSHOT_KEYS = new Set([
  'Blueprint', 'Blueprint (Robinhood)', 'Robinhood',
  'Roth IRA', 'Roth',
  'Trading', 'Trading Account',
])

export function useLiveNetWorth() {
  const { latestNetWorth, portfolio, accountCash } = useData()

  // Start from snapshot but strip any investment account keys —
  // we'll add live values for those so there's no double-counting
  const accounts = {}
  for (const [key, val] of Object.entries(latestNetWorth?.accounts ?? {})) {
    if (!INVESTMENT_SNAPSHOT_KEYS.has(key) && val > 0) {
      accounts[key] = val
    }
  }

  // Add live investment account values (positions cost-basis + cash)
  for (const acct of INVESTMENT_ACCOUNTS) {
    const posVal = portfolio
      .filter(p => (p.account ?? 'Blueprint') === acct && p.shares > 0)
      .reduce((s, p) => s + p.shares * p.avg_cost, 0)
    const cash = accountCash[acct]?.balance ?? 0
    const total = posVal + cash
    if (total > 0) accounts[acct] = total
  }

  // Add crypto positions
  const cryptoVal = portfolio
    .filter(p => p.account === 'Crypto' && p.shares > 0)
    .reduce((s, p) => s + p.shares * p.avg_cost, 0)
  const cryptoCash = accountCash['Crypto']?.balance ?? 0
  const cryptoTotal = cryptoVal + cryptoCash
  if (cryptoTotal > 0) accounts['Crypto'] = cryptoTotal

  const liveTotal = Object.values(accounts).reduce((s, v) => s + (v ?? 0), 0)

  return { liveTotal, accounts }
}
