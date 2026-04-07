import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatRelativeDate } from '../../lib/formatters'

const NAV_LINKS = [
  { path: '/',           label: 'Command' },
  { path: '/budget',     label: 'Budget' },
  { path: '/networth',   label: 'Net Worth' },
  { path: '/portfolio',  label: 'Portfolio' },
  { path: '/milestones', label: 'Milestones' },
  { path: '/settings',   label: 'Settings' },
]

export function TopNav() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { lastUpdated } = useData()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const timeStr = time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <nav
      className="hidden md:flex items-center justify-between px-6 py-3 border-b sticky top-0 z-50"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      <Link
        to="/"
        className="text-sm font-bold tracking-widest"
        style={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}
      >
        BLUEPRINT OS
      </Link>

      <div className="flex items-center gap-1">
        {NAV_LINKS.map(link => {
          const active = location.pathname === link.path
          return (
            <Link
              key={link.path}
              to={link.path}
              className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
              style={{
                color: active ? 'var(--accent-green)' : 'var(--text-secondary)',
                backgroundColor: active ? 'var(--bg-tertiary)' : 'transparent',
              }}
            >
              {link.label}
            </Link>
          )
        })}
      </div>

      <div className="flex items-center gap-4">
        {lastUpdated && (
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            {formatRelativeDate(lastUpdated)}
          </span>
        )}
        <span
          className="text-sm tabular-nums"
          style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace" }}
        >
          {timeStr}
        </span>
        {user && (
          <button
            onClick={signOut}
            className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}
          >
            Sign out
          </button>
        )}
      </div>
    </nav>
  )
}
