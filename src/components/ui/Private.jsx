import { usePrivacy } from '../../context/PrivacyContext'

export function Private({ children }) {
  const { privacyMode } = usePrivacy()
  return (
    <span
      style={privacyMode ? {
        filter: 'blur(8px)',
        userSelect: 'none',
        pointerEvents: 'none',
        transition: 'filter 0.2s ease',
      } : {
        transition: 'filter 0.2s ease',
      }}
    >
      {children}
    </span>
  )
}
