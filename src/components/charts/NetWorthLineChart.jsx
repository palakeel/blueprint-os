import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatMoney } from '../../lib/formatters'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded border text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
      <div style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="font-semibold mt-0.5" style={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}>
        {formatMoney(payload[0].value)}
      </div>
    </div>
  )
}

export function NetWorthLineChart({ data, range = '1Y' }) {
  const now = new Date()
  const cutoff = {
    '3M':  new Date(now.getFullYear(), now.getMonth() - 3,  1),
    '6M':  new Date(now.getFullYear(), now.getMonth() - 6,  1),
    '1Y':  new Date(now.getFullYear() - 1, now.getMonth(), 1),
    'ALL': new Date(0),
  }[range] ?? new Date(0)

  const chartData = [...data]
    .filter(e => new Date(e.entry_date) >= cutoff)
    .reverse()
    .map(e => ({
      date:  new Date(e.entry_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      value: e.net_worth,
    }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-tertiary)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={v => formatMoney(v)}
          tick={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--accent-green)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--accent-green)', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
