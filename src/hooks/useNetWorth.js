import { useData } from '../context/DataContext'
import { calcDailyVelocity } from '../lib/calculations'

export function useNetWorth() {
  const { netWorthHistory, latestNetWorth, prevNetWorth } = useData()

  const current   = latestNetWorth?.net_worth ?? 0
  const prev      = prevNetWorth?.net_worth   ?? 0
  const momChange = current - prev
  const momPct    = prev > 0 ? ((current - prev) / prev) * 100 : 0

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const nw30d = netWorthHistory.find(e => new Date(e.entry_date) <= thirtyDaysAgo)
  const dailyVelocity = calcDailyVelocity(current, nw30d?.net_worth)

  return { current, prev, momChange, momPct, dailyVelocity, history: netWorthHistory }
}
