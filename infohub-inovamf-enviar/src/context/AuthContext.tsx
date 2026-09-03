import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { User } from '../types'
import { USERS } from '../data/users'

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => { ok: boolean; message?: string; user?: User }
  loginAs: (role: 'admin' | 'mentor' | 'aluno') => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'infohub_current_user_id'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedId = sessionStorage.getItem(STORAGE_KEY)
    return savedId ? USERS.find((u) => u.id === savedId) ?? null : null
  })

  const login = useCallback((email: string, password: string) => {
    const found = USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    )
    if (!found) {
      return { ok: false, message: 'E-mail ou senha inválidos. Tente novamente ou use um dos acessos rápidos.' }
    }
    setUser(found)
    sessionStorage.setItem(STORAGE_KEY, found.id)
    return { ok: true, user: found }
  }, [])

  const loginAs = useCallback((role: 'admin' | 'mentor' | 'aluno') => {
    const found =
      role === 'admin'
        ? USERS.find((u) => u.role === 'admin')
        : role === 'mentor'
        ? USERS.find((u) => u.id === 'u-mentor1')
        : USERS.find((u) => u.id === 'u1')
    if (found) {
      setUser(found)
      sessionStorage.setItem(STORAGE_KEY, found.id)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const value = useMemo(() => ({ user, login, loginAs, logout }), [user, login, loginAs, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
