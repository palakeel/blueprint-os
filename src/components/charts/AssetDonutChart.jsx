import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMoney } from '../../lib/formatters'

export const DONUT_COLORS = ['#00ff88','#fbbf24','#3b82f6','#06b6d4','#a78bfa','#f87171','#34d399','#fb923c']

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-2.5 py-1.5 rounded border text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
      <div style={{ color: 'var(--text-secondary)' }}>{payload[0].name}</div>
      <div className="font-mono" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
        {formatMoney(payload[0].value)}
      </div>
    </div>
  )
}

export function AssetDonutChart({ data }) {
  return (
    <ResponsiveContainer width={140} height={140}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={44}
          outerRadius={66}
          paddingAngle={2}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
