import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { formatDate } from '../lib/formatters'
import { ANNUAL_EXPENSES, MONTHLY_INCOME, MONTHLY_FIXED, calcFiNumber } from '../lib/calculations'

export function Settings() {
  const { user, signOut } = useAuth()
  const { budgetTargets, lastUpdated } = useData()
  const totalMonthlyBudget = Object.values(budgetTargets).reduce((a, b) => a + b, 0)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Settings</h1>

      <div className="space-y-4">
        <Section title="Profile">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {user?.email ?? 'Demo mode (not signed in)'}
              </div>
              {lastUpdated && (
                <div className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                  Last sync: {formatDate(lastUpdated)}
                </div>
              )}
            </div>
            {user
              ? <button onClick={signOut} className="px-3 py-1.5 rounded text-sm border transition-opacity hover:opacity-70"
                  style={{ color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}>
                  Sign out
                </button>
              : <a href="/login" className="text-sm" style={{ color: 'var(--accent-blue)' }}>Sign in →</a>
            }
          </div>
        </Section>

        <Section title="Monthly Budget Targets">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Total per month</span>
            <span className="tabular-nums text-sm font-semibold" style={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}>
              ${totalMonthlyBudget}/mo
            </span>
          </div>
          <div className="space-y-2">
            {Object.entries(budgetTargets).map(([cat, target]) => (
              <div key={cat} className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>{cat}</span>
                <span className="tabular-nums" style={{ color: 'var(--text-primary)', fontFamily: "'JetBrains Mono', monospace" }}>
                  ${target}/mo
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Financial Config">
          <div className="space-y-2 text-sm">
            <Row label="Monthly Income"        value={`$${MONTHLY_INCOME.toLocaleString()}`} />
            <Row label="Fixed Expenses"        value={`$${MONTHLY_FIXED.toLocaleString()}`} />
            <Row label="Annual Expenses (FI)"  value={`$${ANNUAL_EXPENSES.toLocaleString()}`} />
            <Row label="FI Number (25×)"       value={`$${calcFiNumber().toLocaleString()}`} color="var(--accent-amber)" />
          </div>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-lg p-4 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Row({ label, value, color = 'var(--text-primary)' }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="tabular-nums" style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
    </div>
  )
}
