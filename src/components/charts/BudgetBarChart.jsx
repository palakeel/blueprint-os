import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatMoney } from '../../lib/formatters'

export function BudgetBarChart({ entries, targets }) {
  const weeklyBudget = Object.values(targets).reduce((a, b) => a + b, 0)

  const data = [...entries].slice(0, 8).reverse().map(e => ({
    week:   new Date(e.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    spent:  e.total_spent,
    budget: weeklyBudget,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-tertiary)" vertical={false} />
        <XAxis dataKey="week" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => `$${v}`} tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: 'var(--text-secondary)' }}
          formatter={(v) => [formatMoney(v), 'Spent']}
          itemStyle={{ color: 'var(--accent-blue)', fontFamily: 'JetBrains Mono' }}
        />
        <Bar dataKey="spent" fill="var(--accent-blue)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
