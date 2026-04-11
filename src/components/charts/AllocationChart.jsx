import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded border text-xs space-y-1" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
      <div className="font-bold" style={{ color: 'var(--accent-cyan)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value?.toFixed(1)}%
        </div>
      ))}
    </div>
  )
}

export function AllocationChart({ portfolio, prices = {} }) {
  const total = portfolio.reduce((s, p) => {
    const price = prices[p.ticker]?.price ?? p.avg_cost
    return s + p.shares * price
  }, 0)

  const data = portfolio
    .filter(p => p.target_allocation > 0)
    .map(p => {
      const price = prices[p.ticker]?.price ?? p.avg_cost
      const value = p.shares * price
      return {
        ticker:  p.ticker,
        Current: total > 0 ? parseFloat(((value / total) * 100).toFixed(1)) : 0,
        Target:  p.target_allocation,
      }
    })

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="ticker" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => `${v}%`} tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
          formatter={v => <span style={{ color: 'var(--text-secondary)' }}>{v}</span>}
        />
        <Bar dataKey="Current" fill="var(--accent-blue)"  radius={[3, 3, 0, 0]} />
        <Bar dataKey="Target"  fill="var(--accent-green)" radius={[3, 3, 0, 0]} opacity={0.5} />
      </BarChart>
    </ResponsiveContainer>
  )
}
