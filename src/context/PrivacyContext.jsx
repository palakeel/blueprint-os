import { createContext, useContext, useState, useEffect } from 'react'

const PrivacyContext = createContext(null)

export function PrivacyProvider({ children }) {
  const [privacyMode, setPrivacyMode] = useState(() => {
    try { return localStorage.getItem('blueprint-privacy') === 'true' } catch { return false }
  })

  const toggle = () => setPrivacyMode(v => {
    const next = !v
    try { localStorage.setItem('blueprint-privacy', String(next)) } catch {}
    return next
  })

  return (
    <PrivacyContext.Provider value={{ privacyMode, toggle }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  return useContext(PrivacyContext)
}
