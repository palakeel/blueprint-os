import { useData } from '../context/DataContext'

// Maps portfolio account names → net worth snapshot account keys
const ACCT_MAP = {
  'Blueprint': 'Blueprint (Robinhood)',
  'Roth IRA':  'Roth IRA',
  'Trading':   'Trading Account',
}

/**
 * Returns a live net worth total and per-account breakdown by overlaying
 * live position cost-basis + cash balances on top of the latest snapshot.
 * Non-investment accounts (bank, crypto, etc.) come from the snapshot as-is.
 */
export function useLiveNetWorth() {
  const { latestNetWorth, portfolio, accountCash } = useData()

  // Start from snapshot so bank/other accounts are included
  const accounts = { ...(latestNetWorth?.accounts ?? {}) }

  for (const [portAcct, snapshotKey] of Object.entries(ACCT_MAP)) {
    const posVal = portfolio
      .filter(p => (p.account ?? 'Blueprint') === portAcct && p.shares > 0)
      .reduce((s, p) => s + p.shares * p.avg_cost, 0)
    const cash = accountCash[portAcct]?.balance ?? 0
    const total = posVal + cash
    if (total > 0) accounts[snapshotKey] = total
  }

  const liveTotal = Object.values(accounts).reduce((s, v) => s + (v ?? 0), 0)

  return { liveTotal, accounts }
}
