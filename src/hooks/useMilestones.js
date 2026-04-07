import { useData } from '../context/DataContext'
import { useNetWorth } from './useNetWorth'
import { calcMilestoneETA, calcMonthlyGrowthRate } from '../lib/calculations'

export function useMilestones() {
  const { milestones } = useData()
  const { history, current } = useNetWorth()

  const nw3mAgo = history.length >= 3 ? history[2]?.net_worth : null
  const monthlyGrowthRate = nw3mAgo
    ? calcMonthlyGrowthRate(current, nw3mAgo)
    : 1500 // default estimate

  const enriched = milestones.map(m => ({
    ...m,
    current_amount: current,
    progress: Math.min(100, (current / m.target_amount) * 100),
    eta: calcMilestoneETA(m.target_amount, current, monthlyGrowthRate),
  }))

  return { milestones: enriched, monthlyGrowthRate }
}
