import React, { useState, useRef, useEffect } from 'react'
import { Menu, ChevronDown, LogOut, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export const Navbar: React.FC<{ onMenuClick: () => void; title: string }> = ({ onMenuClick, title }) => {
  const { user, logout } = useAuth()
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
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-lg p-2 text-ink-700 hover:bg-slate-100 lg:hidden" aria-label="Abrir menu">
          <Menu size={20} />
        </button>
        <h1 className="font-display text-base font-semibold text-ink-900 sm:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button className="relative rounded-lg p-2 text-ink-700/60 hover:bg-slate-100" aria-label="Notificações">
          <Bell size={19} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-trail-late" />
        </button>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpenMenu((v) => !v)}
            className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 hover:bg-slate-100"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: user?.avatarColor ?? '#4640DE' }}
            >
              {initials}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight text-ink-900">{user?.name}</span>
              <span className="block text-[11px] leading-tight text-ink-700/50">
                {user?.role === 'admin' ? 'Administrador(a)' : user?.course}
              </span>
            </span>
            <ChevronDown size={15} className="text-ink-700/50" />
          </button>

          {openMenu && (
            <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-card">
              <div className="border-b border-slate-100 px-3.5 py-2.5">
                <p className="text-sm font-semibold text-ink-900">{user?.name}</p>
                <p className="text-xs text-ink-700/50">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  logout()
                  navigate('/login')
                }}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
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
