import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const INACTIVITY_MS = 60 * 60 * 1000 // 1 hour
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const resetTimer = useCallback(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) supabase.auth.signOut()
      })
    }, INACTIVITY_MS)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session) resetTimer()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session) resetTimer()
      else clearTimeout(timerRef.current)
    })
    return () => { subscription.unsubscribe(); clearTimeout(timerRef.current) }
  }, [resetTimer])

  useEffect(() => {
    if (!user) return
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    return () => ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
  }, [user, resetTimer])

  const signIn  = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp  = (email, password) => supabase.auth.signUp({ email, password })

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
