import { useState, useEffect } from 'react'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'
import { useAuth } from '../../contexts/AuthContext'

export default function AuthScreen() {
  const [view, setView] = useState('login')
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      setView('login')
    }
  }, [user])

  if (view === 'register') {
    return <RegisterPage onSwitchToLogin={() => setView('login')} />
  }
  return <LoginPage onSwitchToRegister={() => setView('register')} />
}
