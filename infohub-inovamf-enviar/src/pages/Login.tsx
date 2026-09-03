import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck, GraduationCap, Compass, ArrowRight, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Input, Button, Field } from '../components/FormControls'
import { Modal } from '../components/Modal'

const Login: React.FC = () => {
  const { login, loginAs } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [recoverOpen, setRecoverOpen] = useState(false)
  const [recoverSent, setRecoverSent] = useState(false)

  const goHomeFor = (role: string) => navigate(role === 'admin' ? '/admin' : role === 'mentor' ? '/mentor' : '/aluno')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = login(email, password)
    if (!result.ok || !result.user) {
      setError(result.message ?? 'Não foi possível entrar.')
      return
    }
    setError('')
    goHomeFor(result.user.role)
  }

  const quickAccess = (role: 'admin' | 'mentor' | 'aluno') => {
    loginAs(role)
    goHomeFor(role)
  }

  return (
    <div className="grid min-h-screen bg-ink-950 lg:grid-cols-2">
      {/* Lado visual */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-brand-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-grid-faint bg-[size:32px_32px] opacity-40" />
        <div className="relative flex items-center gap-2.5">
          <img src="/brand/logo-icon.png" alt="" className="h-10 w-10 object-contain" />
          <span className="font-display text-lg font-bold text-white">
            info<span className="text-[#F5541D]">hub</span>
          </span>
        </div>

        <div className="relative">
          <p className="font-display text-4xl font-semibold leading-tight text-white xl:text-5xl">
            Da ideia ao pitch,<br /> uma trilha só.
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50">
            Acompanhe a jornada de equipes universitárias desde o envio da ideia até ficarem
            prontas para o InovAMF — em seis etapas guiadas por mentoria.
          </p>

          <div className="mt-8 flex items-center gap-6">
            {[
              { n: '6', l: 'etapas guiadas' },
              { n: '100%', l: 'acompanhamento' },
              { n: '1', l: 'trilha até o InovAMF' },
            ].map((s) => (
              <div key={s.l}>
                <p className="font-display text-2xl font-bold text-white">{s.n}</p>
                <p className="text-xs text-white/40">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/30">© 2026 InfoHub — Programa de pré-incubação</p>
      </div>

      {/* Lado do formulário */}
      <div className="relative flex items-center justify-center bg-slate-50 dark:bg-ink-950 px-4 py-10 sm:px-8">
        <button
          onClick={toggleTheme}
          className="absolute right-4 top-4 rounded-lg p-2 text-ink-700/50 dark:text-white/40 hover:bg-slate-100 dark:hover:bg-white/10 sm:right-6 sm:top-6"
          aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <img src="/brand/logo-horizontal.png" alt="InfoHub — Conectando conhecimento, tecnologia & inovação" className="h-14 w-auto object-contain" />
          </div>

          <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-white">Bem-vindo de volta</h2>
          <p className="mt-1.5 text-sm text-ink-700/60 dark:text-white/50">Entre com sua conta para acompanhar a jornada.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Field label="E-mail" required>
              <Input
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>

            <Field label="Senha" required>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-700/40 dark:text-white/35 hover:text-ink-700"
                  aria-label="Mostrar senha"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {error && (
              <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 text-ink-700/60 dark:text-white/50">
                <input type="checkbox" className="rounded border-slate-300 dark:border-white/15 text-brand-600 dark:text-brand-400 focus:ring-brand-400" />
                Manter conectado
              </label>
              <button
                type="button"
                onClick={() => setRecoverOpen(true)}
                className="font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
              >
                Recuperar senha
              </button>
            </div>

            <Button type="submit" className="w-full">
              Entrar <ArrowRight size={16} />
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-700/40 dark:text-white/35">Acesso rápido de demonstração</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => quickAccess('admin')}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-ink-900 p-3.5 text-center transition hover:border-brand-300 dark:hover:border-brand-500/40 hover:bg-brand-50 dark:hover:bg-brand-500/15"
            >
              <ShieldCheck size={19} className="text-brand-600 dark:text-brand-400" />
              <span className="text-[11px] font-semibold leading-tight text-ink-900 dark:text-white">Admin</span>
            </button>
            <button
              onClick={() => quickAccess('mentor')}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-ink-900 p-3.5 text-center transition hover:border-brand-300 dark:hover:border-brand-500/40 hover:bg-brand-50 dark:hover:bg-brand-500/15"
            >
              <Compass size={19} className="text-brand-600 dark:text-brand-400" />
              <span className="text-[11px] font-semibold leading-tight text-ink-900 dark:text-white">Mentor(a)</span>
            </button>
            <button
              onClick={() => quickAccess('aluno')}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-ink-900 p-3.5 text-center transition hover:border-brand-300 dark:hover:border-brand-500/40 hover:bg-brand-50 dark:hover:bg-brand-500/15"
            >
              <GraduationCap size={19} className="text-brand-600 dark:text-brand-400" />
              <span className="text-[11px] font-semibold leading-tight text-ink-900 dark:text-white">Aluno(a)</span>
            </button>
          </div>

          <p className="mt-6 text-center text-[11px] text-ink-700/40 dark:text-white/35">
            Ambiente de demonstração — dados fictícios, sem envio real de e-mails ou integrações.
          </p>
        </div>
      </div>

      <Modal
        open={recoverOpen}
        onClose={() => {
          setRecoverOpen(false)
          setRecoverSent(false)
        }}
        title="Recuperar senha"
        subtitle="Simulação de recuperação de acesso"
      >
        {recoverSent ? (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            Se este e-mail existir em nossa base, enviaríamos um link de redefinição. (Simulado — nenhum e-mail é enviado de verdade.)
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setRecoverSent(true)
            }}
            className="space-y-4"
          >
            <Field label="E-mail cadastrado" required>
              <Input type="email" placeholder="voce@exemplo.com" required />
            </Field>
            <Button type="submit" className="w-full">
              Enviar link de redefinição
            </Button>
          </form>
        )}
      </Modal>
    </div>
  )
}

export default Login
