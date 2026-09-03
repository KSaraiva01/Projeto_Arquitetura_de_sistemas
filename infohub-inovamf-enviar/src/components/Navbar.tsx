import React, { useState, useRef, useEffect } from 'react'
import { Menu, ChevronDown, LogOut, Bell, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useNavigate } from 'react-router-dom'

export const Navbar: React.FC<{ onMenuClick: () => void; title: string }> = ({ onMenuClick, title }) => {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [openMenu, setOpenMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const initials = user?.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 dark:border-white/15 bg-white/90 dark:bg-ink-900/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-lg p-2 text-ink-700 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden" aria-label="Abrir menu">
          <Menu size={20} />
        </button>
        <h1 className="font-display text-base font-semibold text-ink-900 dark:text-white sm:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-ink-700/60 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10"
          aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        </button>

        <button className="relative rounded-lg p-2 text-ink-700/60 dark:text-white/50 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Notificações">
          <Bell size={19} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-trail-late" />
        </button>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpenMenu((v) => !v)}
            className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: user?.avatarColor ?? '#4640DE' }}
            >
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight text-ink-900 dark:text-white">{user?.name}</span>
              <span className="block text-[11px] leading-tight text-ink-700/50 dark:text-white/40">
                {user?.role === 'admin' ? 'Administrador(a)' : user?.role === 'mentor' ? 'Mentor(a)' : user?.course}
              </span>
            </span>
            <ChevronDown size={15} className="text-ink-700/50 dark:text-white/40" />
          </button>

          {openMenu && (
            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-ink-900 py-1 shadow-card dark:shadow-none">
              <div className="border-b border-slate-100 dark:border-white/10 px-3.5 py-2.5">
                <p className="text-sm font-semibold text-ink-900 dark:text-white">{user?.name}</p>
                <p className="text-xs text-ink-700/50 dark:text-white/40">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
