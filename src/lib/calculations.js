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

// 8% annual market return (compound), split into monthly rate
const ANNUAL_RETURN = 0.08
const MONTHLY_MARKET_RATE = Math.pow(1 + ANNUAL_RETURN, 1 / 12) - 1 // ~0.6434%

export function calcMonthsToMilestone(target, current, monthlyAddition) {
  if (current >= target) return 0
  const r   = MONTHLY_MARKET_RATE
  // Cash contribution beyond what market returns on existing balance
  const pmt = Math.max(0, monthlyAddition - current * r)
  if (r <= 0 && pmt <= 0) return null
  // FV = PV*(1+r)^n + PMT*((1+r)^n-1)/r  →  solve for n
  const num = target * r + pmt
  const den = current * r + pmt
  if (den <= 0 || num <= den) return null
  const months = Math.ceil(Math.log(num / den) / Math.log(1 + r))
  return months > 0 ? months : 0
}

export function calcMilestoneETA(target, current, monthlyGrowthRate) {
  const months = calcMonthsToMilestone(target, current, monthlyGrowthRate)
  if (months === null) return 'N/A'
  if (months === 0)    return 'Achieved!'
  if (months > 600)    return '> 50 yrs'   // cap — not meaningful beyond that
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
  const r   = MONTHLY_MARKET_RATE
  const pmt = Math.max(0, monthlyGrowthRate - current * r)
  // FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
  const project = n => current * Math.pow(1 + r, n) + pmt * (Math.pow(1 + r, n) - 1) / r
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
