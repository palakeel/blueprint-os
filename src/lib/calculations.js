export const MONTHLY_INCOME = 6010
export const MONTHLY_FIXED  = 3557
export const ANNUAL_EXPENSES = 47000

export function calcFiNumber(annualExpenses = ANNUAL_EXPENSES) {
  return annualExpenses * 25
}

export function calcDailyVelocity(netWorthNow, netWorth30DaysAgo) {
  if (!netWorth30DaysAgo) return 0
  return (netWorthNow - netWorth30DaysAgo) / 30
}

export function calcMonthlyGrowthRate(netWorthNow, netWorth3MonthsAgo) {
  if (!netWorth3MonthsAgo) return 0
  return (netWorthNow - netWorth3MonthsAgo) / 3
}

export function calcMonthsToMilestone(target, current, monthlyGrowthRate) {
  if (monthlyGrowthRate <= 0) return null
  const remaining = target - current
  if (remaining <= 0) return 0
  return Math.ceil(remaining / monthlyGrowthRate)
}

export function calcMilestoneETA(target, current, monthlyGrowthRate) {
  const months = calcMonthsToMilestone(target, current, monthlyGrowthRate)
  if (months === null) return 'N/A'
  if (months === 0) return 'Achieved!'
  const eta = new Date()
  eta.setMonth(eta.getMonth() + months)
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(eta)
}

export function calcWeeklyScore({ hasSubmittedBudget, onPace, netWorthUp, dcaConfirmed }) {
  let score = 0
  if (hasSubmittedBudget) score += 25
  if (onPace)             score += 25
  if (netWorthUp)         score += 25
  if (dcaConfirmed)       score += 25
  return score
}

export function calcProjections(current, monthlyGrowthRate) {
  const project = months => current + monthlyGrowthRate * months
  return [
    { label: '1 Year',   months: 12,  value: project(12)  },
    { label: '3 Years',  months: 36,  value: project(36)  },
    { label: '5 Years',  months: 60,  value: project(60)  },
    { label: '10 Years', months: 120, value: project(120) },
  ]
}

export function calcSuggestedBudget(budgetEntries) {
  if (!budgetEntries || budgetEntries.length < 12) return null
  const recent = budgetEntries.slice(0, 12)
  const categories = Object.keys(recent[0].categories ?? {})
  const suggested = {}
  for (const cat of categories) {
    const avg = recent.reduce((s, e) => s + (e.categories?.[cat] ?? 0), 0) / recent.length
    suggested[cat] = Math.round(avg * 1.1)
  }
  return suggested
}

export function getScoreGrade(score) {
  if (score >= 100) return { grade: 'A+', color: 'var(--accent-green)' }
  if (score >= 75)  return { grade: 'A',  color: 'var(--accent-green)' }
  if (score >= 50)  return { grade: 'B',  color: 'var(--accent-cyan)'  }
  if (score >= 25)  return { grade: 'C',  color: 'var(--accent-amber)' }
  return               { grade: 'D',  color: 'var(--accent-red)'   }
}
