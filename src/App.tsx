import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

import Login from './pages/Login'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminTeams from './pages/admin/AdminTeams'
import AdminKanban from './pages/admin/AdminKanban'
import TeamDetails from './pages/admin/TeamDetails'
import AdminTasks from './pages/admin/AdminTasks'
import AdminDeliveries from './pages/admin/AdminDeliveries'
import AdminReports from './pages/admin/AdminReports'

import StudentDashboard from './pages/student/StudentDashboard'
import StudentTeam from './pages/student/StudentTeam'
import StudentJourney from './pages/student/StudentJourney'
import StudentTasks from './pages/student/StudentTasks'
import StudentDeliveries from './pages/student/StudentDeliveries'

const App: React.FC = () => {
  const { user } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/aluno'} replace /> : <Login />}
      />

      {/* Administrador */}
      <Route path="/admin" element={<ProtectedRoute allow="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/equipes" element={<ProtectedRoute allow="admin"><AdminTeams /></ProtectedRoute>} />
      <Route path="/admin/equipes/:teamId" element={<ProtectedRoute allow="admin"><TeamDetails /></ProtectedRoute>} />
      <Route path="/admin/kanban" element={<ProtectedRoute allow="admin"><AdminKanban /></ProtectedRoute>} />
      <Route path="/admin/tarefas" element={<ProtectedRoute allow="admin"><AdminTasks /></ProtectedRoute>} />
      <Route path="/admin/entregas" element={<ProtectedRoute allow="admin"><AdminDeliveries /></ProtectedRoute>} />
      <Route path="/admin/relatorios" element={<ProtectedRoute allow="admin"><AdminReports /></ProtectedRoute>} />

      {/* Aluno */}
      <Route path="/aluno" element={<ProtectedRoute allow="aluno"><StudentDashboard /></ProtectedRoute>} />
      <Route path="/aluno/equipe" element={<ProtectedRoute allow="aluno"><StudentTeam /></ProtectedRoute>} />
      <Route path="/aluno/jornada" element={<ProtectedRoute allow="aluno"><StudentJourney /></ProtectedRoute>} />
      <Route path="/aluno/tarefas" element={<ProtectedRoute allow="aluno"><StudentTasks /></ProtectedRoute>} />
      <Route path="/aluno/entregas" element={<ProtectedRoute allow="aluno"><StudentDeliveries /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/aluno') : '/login'} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
