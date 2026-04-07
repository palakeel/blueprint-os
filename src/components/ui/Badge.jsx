export function Badge({ icon, name, description, earned = true }) {
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${!earned ? 'opacity-40' : ''}`}
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        borderColor: earned ? 'var(--accent-amber)' : 'var(--border)',
      }}
    >
      <span className="text-base">{icon}</span>
      <div>
        <div className="font-medium" style={{ color: earned ? 'var(--accent-amber)' : 'var(--text-secondary)' }}>
          {name}
        </div>
        {description && (
          <div style={{ color: 'var(--text-dim)' }}>{description}</div>
        )}
      </div>
    </div>
  )
}
