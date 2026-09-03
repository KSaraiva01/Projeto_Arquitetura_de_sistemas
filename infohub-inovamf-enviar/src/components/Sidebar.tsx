import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Trello,
  ListChecks,
  UploadCloud,
  BarChart3,
  ClipboardList,
  Route,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBasePath } from '../utils/basePath'

const staffLinks = (base: string) => [
  { to: base, label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: `${base}/equipes`, label: 'Equipes', icon: Users },
  { to: `${base}/kanban`, label: 'Kanban da jornada', icon: Trello },
  { to: `${base}/tarefas`, label: 'Tarefas', icon: ListChecks },
  { to: `${base}/entregas`, label: 'Entregas', icon: UploadCloud },
  { to: `${base}/relatorios`, label: 'Relatórios', icon: BarChart3 },
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
  const basePath = useBasePath()
  const links = user?.role === 'aluno' ? studentLinks : staffLinks(basePath)

  const footerCopy =
    user?.role === 'admin'
      ? { title: 'Painel administrativo', text: 'Acompanhe todas as equipes até a inscrição no InovAMF.' }
      : user?.role === 'mentor'
      ? { title: 'Painel do mentor', text: 'Oriente suas equipes e gerencie prazos das tarefas da jornada.' }
      : { title: 'Trilha do InovAMF', text: 'Complete as 6 etapas e fique pronto para o InovAMF.' }

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
            <img src="/brand/logo-icon.png" alt="" className="h-9 w-9 object-contain" />
            <div className="leading-tight">
              <p className="font-display text-sm font-bold tracking-tight">
                <span className="text-white">info</span>
                <span className="text-[#F5541D]">hub</span>
              </p>
              <p className="text-[11px] text-white/50">→ InovAMF</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-white/60 hover:bg-white/10 dark:hover:bg-white/10 lg:hidden" aria-label="Fechar menu">
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
                    ? 'bg-brand-600 text-white shadow-soft dark:shadow-none'
                    : 'text-white/60 hover:bg-white/10 dark:hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mx-3 mb-4 rounded-xl bg-white dark:bg-ink-900 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">{footerCopy.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">{footerCopy.text}</p>
        </div>
      </aside>
    </>
  )
}
