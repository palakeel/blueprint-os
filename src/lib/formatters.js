export function formatMoney(value, decimals = 0) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000)     return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export function formatMoneyFull(value) {
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return value < 0 ? `-$${formatted}` : `$${formatted}`
}

export function formatChange(value) {
  const prefix = value >= 0 ? '▲' : '▼'
  return `${prefix} ${formatMoney(Math.abs(value))}`
}

export function formatPercent(value, decimals = 1) {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function localDateString(date = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDate(date) {
  const d = typeof date === 'string' && date.length === 10 ? new Date(date + 'T12:00:00') : new Date(date)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
}

export function formatRelativeDate(date) {
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)   return `${diffDays}d ago`
  return formatDate(date)
}

export function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatWeekLabel(weekStart) {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const fmt = d => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d)
  return `${fmt(weekStart)} – ${fmt(end)}`
}
