import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider }          from './context/DataContext'
import { ToastProvider }         from './context/ToastContext'
import { PageWrapper }           from './components/layout/PageWrapper'
import { Dashboard }  from './pages/Dashboard'
import { Budget }     from './pages/Budget'
import { NetWorth }   from './pages/NetWorth'
import { Portfolio }  from './pages/Portfolio'
import { Milestones } from './pages/Milestones'
import { Settings }   from './pages/Settings'
import { Login }      from './pages/Login'

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <span className="text-sm" style={{ color: 'var(--accent-green)', fontFamily: "'JetBrains Mono', monospace" }}>
        BLUEPRINT OS
      </span>
    </div>
  )
}

function AppRoutes() {
  const { loading } = useAuth()
  if (loading) return <Loader />

  return (
    <ToastProvider>
    <DataProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <PageWrapper>
            <Routes>
              <Route path="/"           element={<Dashboard />}  />
              <Route path="/budget"     element={<Budget />}     />
              <Route path="/networth"   element={<NetWorth />}   />
              <Route path="/portfolio"  element={<Portfolio />}  />
              <Route path="/milestones" element={<Milestones />} />
              <Route path="/settings"   element={<Settings />}   />
            </Routes>
          </PageWrapper>
        } />
      </Routes>
    </DataProvider>
    </ToastProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
