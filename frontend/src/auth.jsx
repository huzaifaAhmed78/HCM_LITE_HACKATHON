import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return getToken() ? JSON.parse(localStorage.getItem('user')) : null } catch { return null }
  })

  const apply = useCallback(({ token, user }) => {
    setToken(token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  useEffect(() => {
    window.addEventListener('auth:logout', logout)
    return () => window.removeEventListener('auth:logout', logout)
  }, [logout])

  const login = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } })
    apply(data)
    return data.user
  }

  return <Ctx.Provider value={{ user, login, logout, apply }}>{children}</Ctx.Provider>
}
