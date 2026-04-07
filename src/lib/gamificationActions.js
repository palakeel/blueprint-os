import { supabase } from './supabase'
import { calcWeeklyScore } from './calculations'

export function calcNewStreak(lastEntryDate, currentStreak = 0) {
  if (!lastEntryDate) return 1
  const days = Math.floor((Date.now() - new Date(lastEntryDate)) / 86400000)
  return days <= 8 ? currentStreak + 1 : 1
}

export function checkNewBadges(existingBadges = [], { netWorth = 0, streak = 0, score = 0 }) {
  const earned = new Set(existingBadges.map(b => b.id))
  const now    = new Date().toISOString()
  const result = []
  const earn   = id => !earned.has(id) && result.push({ id, earned_at: now })

  if (netWorth > 0)       earn('first_entry')
  if (streak >= 4)        earn('week_streak_4')
  if (streak >= 12)       earn('week_streak_12')
  if (score === 100)      earn('perfect_week')
  if (netWorth >= 100000) earn('six_figures')
  if (netWorth >= 500000) earn('half_mil')

  return result
}

export async function upsertGamification(userId, { currentStreak, lastEntryDate, newBadges = [], weekKey, weekScore }) {
  if (!userId) return null

  const { data: existing } = await supabase
    .from('gamification')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const payload = {
    user_id:         userId,
    current_streak:  currentStreak,
    longest_streak:  Math.max(currentStreak, existing?.longest_streak ?? 0),
    last_entry_date: lastEntryDate,
    badges_earned:   [...(existing?.badges_earned ?? []), ...newBadges],
    weekly_scores:   {
      ...(existing?.weekly_scores ?? {}),
      ...(weekKey ? { [weekKey]: weekScore } : {}),
    },
  }

  if (existing) {
    const { data } = await supabase.from('gamification').update(payload).eq('user_id', userId).select().single()
    return data
  } else {
    const { data } = await supabase.from('gamification').insert(payload).select().single()
    return data
  }
}

// Call after saving a budget entry
export async function processBudgetSave(user, gamification, { savedEntry, totalSpent, weeklyBudget, netWorthNow, netWorthPrev, weekStart }) {
  if (!user) return null

  const today      = new Date().toISOString().split('T')[0]
  const newStreak  = calcNewStreak(gamification?.last_entry_date, gamification?.current_streak)
  const onPace     = totalSpent <= weeklyBudget
  const netWorthUp = (netWorthNow ?? 0) >= (netWorthPrev ?? 0)

  const score = calcWeeklyScore({
    hasSubmittedBudget: true,
    onPace,
    netWorthUp,
    dcaConfirmed: gamification?.weekly_scores?.dcaConfirmed ?? false,
  })

  const newBadges = checkNewBadges(gamification?.badges_earned ?? [], {
    netWorth: netWorthNow ?? 0,
    streak:   newStreak,
    score,
  })

  const weekKey = weekStart.toISOString().split('T')[0]

  // Update the saved entry's weekly_score
  await supabase.from('budget_entries').update({ weekly_score: score }).eq('id', savedEntry.id)

  const updated = await upsertGamification(user.id, {
    currentStreak:  newStreak,
    lastEntryDate:  today,
    newBadges,
    weekKey,
    weekScore:      score,
  })

  return { updated, newBadges, score }
}

// Call after saving a net worth entry (badge check only)
export async function processNetWorthSave(user, gamification, { netWorth }) {
  if (!user) return null

  const newBadges = checkNewBadges(gamification?.badges_earned ?? [], {
    netWorth,
    streak: gamification?.current_streak ?? 0,
    score:  0,
  })

  if (newBadges.length === 0) return null

  const updated = await upsertGamification(user.id, {
    currentStreak:  gamification?.current_streak  ?? 0,
    lastEntryDate:  gamification?.last_entry_date ?? null,
    newBadges,
  })

  return { updated, newBadges }
}
