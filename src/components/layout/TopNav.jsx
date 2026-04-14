import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { usePrivacy } from '../../context/PrivacyContext'
import { formatRelativeDate } from '../../lib/formatters'
import { Eye, EyeOff } from 'lucide-react'

const NAV_LINKS = [
  { path: '/',           label: 'Command' },
  { path: '/budget',     label: 'Budget' },
  { path: '/networth',   label: 'Net Worth' },
  { path: '/portfolio',  label: 'Portfolio' },
  { path: '/milestones', label: 'Milestones' },
  { path: '/settings',   label: 'Settings' },
]

const TIMEZONES = [
  { tz: 'America/Los_Angeles', label: 'PT' },
  { tz: 'America/New_York',    label: 'ET' },
  { tz: 'America/Chicago',     label: 'CT' },
  { tz: 'UTC',                 label: 'UTC' },
]

export function TopNav() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { lastUpdated } = useData()
  const { privacyMode, toggle } = usePrivacy()
  const [time, setTime] = useState(new Date())
  const [tzIndex, setTzIndex] = useState(() => {
    try { return parseInt(localStorage.getItem('blueprint-tz') ?? '0', 10) } catch { return 0 }
  })

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const cycleTz = () => {
    const next = (tzIndex + 1) % TIMEZONES.length
    setTzIndex(next)
    try { localStorage.setItem('blueprint-tz', String(next)) } catch {}
  }

  const { tz } = TIMEZONES[tzIndex]
  const timeStr = time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: tz })
  const tzStr   = time.toLocaleTimeString('en-US', { timeZoneName: 'short', timeZone: tz }).split(' ').pop()

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
        <button
          onClick={cycleTz}
          className="text-sm tabular-nums transition-opacity hover:opacity-70"
          style={{ color: 'var(--accent-cyan)', fontFamily: "'JetBrains Mono', monospace", background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          title="Click to change timezone"
        >
          {timeStr} <span style={{ color: 'var(--text-dim)' }}>{tzStr}</span>
        </button>
        <button
          onClick={toggle}
          className="p-1.5 rounded transition-opacity hover:opacity-70"
          style={{ color: privacyMode ? 'var(--accent-amber)' : 'var(--text-dim)' }}
          title={privacyMode ? 'Show data' : 'Hide data'}
        >
          {privacyMode ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
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
