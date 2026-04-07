export function TrafficLight({ pct }) {
  const color = pct <= 60
    ? 'var(--accent-green)'
    : pct <= 90
    ? 'var(--accent-amber)'
    : 'var(--accent-red)'

  return <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
}
