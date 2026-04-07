export function StatCard({ title, children, className = '' }) {
  return (
    <div
      className={`stat-card rounded-lg p-4 border h-full ${className}`}
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      {title && (
        <div className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}
