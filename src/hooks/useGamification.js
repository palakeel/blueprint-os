import { useData } from '../context/DataContext'
import { useBudget } from './useBudget'
import { useNetWorth } from './useNetWorth'
import { calcWeeklyScore, getScoreGrade } from '../lib/calculations'
import { getWeekStart } from '../lib/formatters'

export function useGamification() {
  const { gamification } = useData()
  const { latestEntry, isOnPace } = useBudget()
  const { momChange } = useNetWorth()

  const weekStart = getWeekStart()
  const hasSubmittedThisWeek = latestEntry
    ? new Date(latestEntry.week_start) >= weekStart
    : false

  const dcaConfirmed = gamification?.weekly_scores?.dcaConfirmed ?? false

  const score = calcWeeklyScore({
    hasSubmittedBudget: hasSubmittedThisWeek,
    onPace: isOnPace,
    netWorthUp: momChange >= 0,
    dcaConfirmed,
  })

  const { grade, color } = getScoreGrade(score)

  return {
    score,
    grade,
    gradeColor: color,
    currentStreak: gamification?.current_streak  ?? 0,
    longestStreak: gamification?.longest_streak  ?? 0,
    badges:        gamification?.badges_earned   ?? [],
    lastEntryDate: gamification?.last_entry_date ?? null,
  }
}
