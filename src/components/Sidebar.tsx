import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Trello,
  ListChecks,
  UploadCloud,
  BarChart3,
  Compass,
  ClipboardList,
  Route,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/equipes', label: 'Equipes', icon: Users },
  { to: '/admin/kanban', label: 'Kanban da jornada', icon: Trello },
  { to: '/admin/tarefas', label: 'Tarefas', icon: ListChecks },
  { to: '/admin/entregas', label: 'Entregas', icon: UploadCloud },
  { to: '/admin/relatorios', label: 'Relatórios', icon: BarChart3 },
]

const studentLinks = [
  { to: '/aluno', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/aluno/equipe', label: 'Minha equipe', icon: Users },
  { to: '/aluno/jornada', label: 'Minha jornada', icon: Route },
  { to: '/aluno/tarefas', label: 'Minhas tarefas', icon: ClipboardList },
  { to: '/aluno/entregas', label: 'Envio de entregas', icon: UploadCloud },
]

export const Sidebar: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { user } = useAuth()
  const links = user?.role === 'admin' ? adminLinks : studentLinks

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-ink-950/40 lg:hidden" onClick={onClose} aria-hidden />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink-950 text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <Compass size={19} className="text-white" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold tracking-tight">InfoHub</p>
              <p className="text-[11px] text-white/50">→ InovAMF</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-white/60 hover:bg-white/10 lg:hidden" aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-soft'
                    : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mx-3 mb-4 rounded-xl bg-white/[0.06] p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
            {user?.role === 'admin' ? 'Painel administrativo' : 'Trilha do InovAMF'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            {user?.role === 'admin'
              ? 'Acompanhe todas as equipes até a inscrição no InovAMF.'
              : 'Complete as 6 etapas e fique pronto para o InovAMF.'}
          </p>
        </div>
      </aside>
    </>
  )
}
