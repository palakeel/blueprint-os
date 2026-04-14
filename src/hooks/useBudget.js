import { useData } from '../context/DataContext'

export function useBudget() {
  const { budgetEntries, budgetTargets } = useData()
  const latestEntry = budgetEntries[0] ?? null

  const monthlyBudget = Object.values(budgetTargets).reduce((a, b) => a + b, 0)
  const weeklyBudget  = monthlyBudget / 4.33

  // Monthly pace from last 4 weekly entries
  const last4 = budgetEntries.slice(0, 4)
  const monthlyPace = {}
  for (const entry of last4) {
    for (const [cat, amount] of Object.entries(entry.categories ?? {})) {
      monthlyPace[cat] = (monthlyPace[cat] ?? 0) + amount
    }
  }
  const totalMonthlyPace = Object.values(monthlyPace).reduce((a, b) => a + b, 0)

  return {
    latestEntry,
    currentWeekSpend: latestEntry?.categories ?? {},
    monthlyPace,
    totalMonthlyPace,
    weeklyBudget,
    monthlyBudget,
    isOnPace: totalMonthlyPace <= monthlyBudget,
    history: budgetEntries,
  }
}
