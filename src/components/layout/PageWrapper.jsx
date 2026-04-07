import { TopNav } from './TopNav'
import { BottomNav } from './BottomNav'

export function PageWrapper({ children }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <TopNav />
      <main className="pb-16 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  )
}
