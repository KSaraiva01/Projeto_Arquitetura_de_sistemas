import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Role } from '../types'

export const ProtectedRoute: React.FC<{ allow: Role; children: React.ReactNode }> = ({ allow, children }) => {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== allow) return <Navigate to={user.role === 'admin' ? '/admin' : '/aluno'} replace />

  return <>{children}</>
}
