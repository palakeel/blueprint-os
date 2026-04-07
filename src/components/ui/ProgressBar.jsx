export function ProgressBar({ value, max, color = 'var(--accent-green)', height = 6, animated = true }) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0))

  const barColor = color === 'traffic'
    ? pct <= 60 ? 'var(--accent-green)' : pct <= 90 ? 'var(--accent-amber)' : 'var(--accent-red)'
    : color

  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, backgroundColor: 'var(--bg-tertiary)' }}>
      <div
        className={animated ? 'progress-bar-fill h-full rounded-full' : 'h-full rounded-full transition-all duration-300'}
        style={{ '--w': `${pct}%`, ...(animated ? {} : { width: `${pct}%` }), backgroundColor: barColor }}
      />
    </div>
  )
}
