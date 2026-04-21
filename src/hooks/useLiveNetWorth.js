import { useData } from '../context/DataContext'

const INVESTMENT_ACCOUNTS = ['Blueprint', 'Roth IRA', 'Trading']

const INVESTMENT_SNAPSHOT_KEYS = new Set([
  'Blueprint', 'Blueprint (Robinhood)', 'Robinhood',
  'Roth IRA', 'Roth',
  'Trading', 'Trading Account',
])

export function useLiveNetWorth() {
  const { latestNetWorth, portfolio, accountCash, marketPrices } = useData()

  // Strip investment account keys from snapshot — live data replaces them
  const accounts = {}
  for (const [key, val] of Object.entries(latestNetWorth?.accounts ?? {})) {
    if (!INVESTMENT_SNAPSHOT_KEYS.has(key) && val > 0) {
      accounts[key] = val
    }
  }

  // Investment accounts: use market price when available, fall back to cost basis
  for (const acct of INVESTMENT_ACCOUNTS) {
    const posVal = portfolio
      .filter(p => (p.account ?? 'Blueprint') === acct && p.shares > 0)
      .reduce((s, p) => {
        const livePrice = marketPrices[p.ticker.toUpperCase()]
        return s + p.shares * (livePrice ?? p.avg_cost)
      }, 0)
    const cash = accountCash[acct]?.balance ?? 0
    const total = posVal + cash
    if (total > 0) accounts[acct] = total
  }

  // Crypto account
  const cryptoVal = portfolio
    .filter(p => p.account === 'Crypto' && p.shares > 0)
    .reduce((s, p) => {
      const livePrice = marketPrices[p.ticker.toUpperCase()]
      return s + p.shares * (livePrice ?? p.avg_cost)
    }, 0)
  const cryptoCash = accountCash['Crypto']?.balance ?? 0
  const cryptoTotal = cryptoVal + cryptoCash
  if (cryptoTotal > 0) accounts['Crypto'] = cryptoTotal

  const liveTotal = Object.values(accounts).reduce((s, v) => s + (v ?? 0), 0)

  return { liveTotal, accounts }
}
