import { StatCard } from '../ui/StatCard'
import { useGamification } from '../../hooks/useGamification'

const CIRCUMFERENCE = 2 * Math.PI * 34

export function WeeklyScore() {
  const { score, grade, gradeColor } = useGamification()
  const dash = (score / 100) * CIRCUMFERENCE

  return (
    <StatCard title="Weekly Score">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--bg-tertiary)" strokeWidth="8" />
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke={gradeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
              style={{ transition: 'stroke-dasharray 1s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-bold text-xl leading-none tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
              {score}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>/100</span>
          </div>
        </div>

        <div>
          <div className="text-4xl font-bold" style={{ color: gradeColor }}>{grade}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {score === 100 ? 'Perfect week!' : score >= 75 ? 'Great week!' : score >= 50 ? 'Keep going' : 'Start logging'}
          </div>
          <div className="mt-2 space-y-0.5 text-xs" style={{ color: 'var(--text-dim)' }}>
            <div>Budget logged • On pace</div>
            <div>NW up • DCA confirmed</div>
          </div>
        </div>
      </div>
    </StatCard>
  )
}
