import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Role } from '../types'

const homeFor = (role: Role) => (role === 'admin' ? '/admin' : role === 'mentor' ? '/mentor' : '/aluno')

export const ProtectedRoute: React.FC<{ allow: Role | Role[]; children: React.ReactNode }> = ({ allow, children }) => {
  const { user } = useAuth()
  const allowed = Array.isArray(allow) ? allow : [allow]

  if (!user) return <Navigate to="/login" replace />
  if (!allowed.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />

  return <>{children}</>
}
