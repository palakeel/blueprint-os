import { formatMoney, formatMoneyFull, formatChange } from '../../lib/formatters'

export function MonoNumber({ value, showChange = false, full = false, className = '', style = {} }) {
  const isNeg = value < 0
  const color = showChange
    ? (isNeg ? 'var(--accent-red)' : 'var(--accent-green)')
    : 'var(--text-primary)'

  const text = showChange
    ? formatChange(value)
    : full ? formatMoneyFull(value) : formatMoney(value)

  return (
    <span
      className={`tabular-nums ${className}`}
      style={{ fontFamily: "'JetBrains Mono', monospace", color, ...style }}
    >
      {text}
    </span>
  )
}
