import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback(({ icon, title, message, duration = 4000 }) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, icon, title, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg pointer-events-auto"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--accent-amber)',
            animation: 'toast-in 0.3s ease-out',
            minWidth: 260,
            maxWidth: 320,
          }}
          onClick={() => onDismiss(t.id)}
        >
          <span className="text-2xl flex-shrink-0">{t.icon}</span>
          <div>
            <div className="text-xs font-semibold" style={{ color: 'var(--accent-amber)' }}>
              {t.title}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {t.message}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
