import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const INACTIVITY_MS = 30 * 60 * 1000 // 30 minutes
const CHECK_INTERVAL_MS = 60 * 1000   // check every minute
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const lastActivityRef = useRef(Date.now())
  const intervalRef = useRef(null)

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const recordActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  const startInactivityWatch = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(async () => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_MS) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) supabase.auth.signOut()
      }
    }, CHECK_INTERVAL_MS)
  }, [])

  const stopInactivityWatch = useCallback(() => {
    clearInterval(intervalRef.current)
  }, [])

  // Also check on tab becoming visible after being hidden
  useEffect(() => {
    const onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastActivityRef.current >= INACTIVITY_MS) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) supabase.auth.signOut()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session) startInactivityWatch()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session) startInactivityWatch()
      else stopInactivityWatch()
    })
    return () => { subscription.unsubscribe(); stopInactivityWatch() }
  }, [startInactivityWatch, stopInactivityWatch])

  useEffect(() => {
    if (!user) return
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, recordActivity, { passive: true }))
    return () => ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, recordActivity))
  }, [user, recordActivity])

  const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signUp = (email, password) => supabase.auth.signUp({ email, password })

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
