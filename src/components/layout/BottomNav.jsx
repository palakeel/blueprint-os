import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Wallet, TrendingUp, Briefcase, Target, Settings } from 'lucide-react'

const ITEMS = [
  { path: '/',           Icon: LayoutDashboard, label: 'Home'      },
  { path: '/budget',     Icon: Wallet,          label: 'Budget'    },
  { path: '/networth',   Icon: TrendingUp,      label: 'Net Worth' },
  { path: '/portfolio',  Icon: Briefcase,       label: 'Portfolio' },
  { path: '/milestones', Icon: Target,          label: 'Goals'     },
  { path: '/settings',   Icon: Settings,        label: 'Settings'  },
]

export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 border-t flex z-50"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      {ITEMS.map(({ path, Icon, label }) => {
        const active = pathname === path
        return (
          <Link
            key={path}
            to={path}
            className="flex-1 flex flex-col items-center py-2 gap-0.5"
            style={{ color: active ? 'var(--accent-green)' : 'var(--text-dim)' }}
          >
            <Icon size={18} />
            <span className="text-[9px]">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
