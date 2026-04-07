import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [mode,     setMode]     = useState('login')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [message,  setMessage]  = useState('')
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const { error: err } = await (mode === 'login' ? signIn : signUp)(email, password)

    if (err) {
      setError(err.message)
    } else if (mode === 'signup') {
      setMessage('Check your email to confirm your account.')
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  const fieldStyle = {
    backgroundColor: 'var(--bg-primary)',
    borderColor: 'var(--border)',
    color: 'var(--text-primary)',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="text-2xl font-bold tracking-widest mb-1"
            style={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}
          >
            BLUEPRINT OS
          </div>
          <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Personal Finance Terminal</div>
        </div>

        <div className="rounded-lg p-6 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="flex mb-5 rounded overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setMessage('') }}
                className="flex-1 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: mode === m ? 'var(--bg-tertiary)' : 'transparent',
                  color:           mode === m ? 'var(--text-primary)' : 'var(--text-dim)',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 rounded border outline-none text-sm"
                style={fieldStyle}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-3 py-2 rounded border outline-none text-sm"
                style={fieldStyle}
              />
            </div>

            {error   && <p className="text-sm" style={{ color: 'var(--accent-amber)' }}>{error}</p>}
            {message && <p className="text-sm" style={{ color: 'var(--accent-green)' }}>{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded font-semibold text-sm transition-opacity"
              style={{ backgroundColor: 'var(--accent-green)', color: '#0a0e1a', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <a
              href="/"
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-dim)' }}
            >
              Continue in demo mode →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
