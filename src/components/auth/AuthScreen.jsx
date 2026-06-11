import { useState } from 'react'
import LoginPage from './LoginPage'
import RegisterPage from './RegisterPage'

export default function AuthScreen() {
  const [view, setView] = useState('login')

  if (view === 'register') {
    return <RegisterPage onSwitchToLogin={() => setView('login')} />
  }
  return <LoginPage onSwitchToRegister={() => setView('register')} />
}
