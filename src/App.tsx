import { useState } from 'react'
import type { Credentials } from './api'
import { Login } from './Login/Login'
import { Chat } from './Chat/Chat'
import { actions } from './store'

const loadCreds = (): Credentials | null => {
  try {
    return JSON.parse(localStorage.getItem('creds') ?? 'null')
  } catch {
    return null
  }
}

export const App = () => {
  const [creds, setCreds] = useState<Credentials | null>(loadCreds)

  const login = (c: Credentials) => {
    localStorage.setItem('creds', JSON.stringify(c))
    setCreds(c)
  }
  const logout = () => {
    actions.reset()
    localStorage.clear()
    setCreds(null)
  }

  return creds ? <Chat creds={creds} onLogout={logout} /> : <Login onLogin={login} />
}
