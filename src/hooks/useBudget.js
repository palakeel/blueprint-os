import { useData } from '../context/DataContext'
import { getWeekStart } from '../lib/formatters'

// Group expenses by week (Monday), return map of weekKey → { weekStart, items, totals }
export function groupExpensesByWeek(expenses) {
  const weeks = new Map()
  for (const exp of expenses) {
    const ws = getWeekStart(new Date(exp.date + 'T12:00:00'))
    const key = ws.toISOString().split('T')[0]
    if (!weeks.has(key)) weeks.set(key, { weekStart: ws, items: [], totals: {} })
    const week = weeks.get(key)
    week.items.push(exp)
    week.totals[exp.category] = (week.totals[exp.category] ?? 0) + Number(exp.amount)
  }
  return weeks
}

export function useBudget() {
  const { expenses, budgetTargets } = useData()

  const monthlyBudget = Object.values(budgetTargets).reduce((a, b) => a + b, 0)
  const weeklyBudget  = monthlyBudget / 4.33

  const weekMap = groupExpensesByWeek(expenses)

  // Current week
  const currentWeekKey = getWeekStart().toISOString().split('T')[0]
  const currentWeek    = weekMap.get(currentWeekKey)
  const currentWeekSpend = currentWeek?.totals ?? {}
  const currentWeekTotal = Object.values(currentWeekSpend).reduce((a, b) => a + b, 0)

  // Monthly pace: sum of expenses in the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const monthlyPace = {}
  for (const exp of expenses) {
    if (new Date(exp.date + 'T12:00:00') >= thirtyDaysAgo) {
      monthlyPace[exp.category] = (monthlyPace[exp.category] ?? 0) + Number(exp.amount)
    }
  }
  const totalMonthlyPace = Object.values(monthlyPace).reduce((a, b) => a + b, 0)

  // Sorted list of weeks for history display
  const weekHistory = [...weekMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, week]) => ({
      weekKey:    key,
      weekStart:  week.weekStart,
      items:      week.items.sort((a, b) => b.date.localeCompare(a.date)),
      totals:     week.totals,
      totalSpent: Object.values(week.totals).reduce((a, b) => a + b, 0),
    }))

  return {
    currentWeekSpend,
    currentWeekTotal,
    weeklyBudget,
    monthlyBudget,
    monthlyPace,
    totalMonthlyPace,
    isOnPace: totalMonthlyPace <= monthlyBudget,
    weekHistory,
    allExpenses: expenses,
  }
}
