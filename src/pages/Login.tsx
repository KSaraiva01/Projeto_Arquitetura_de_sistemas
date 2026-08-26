import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, Eye, EyeOff, ShieldCheck, GraduationCap, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Input, Button, Field } from '../components/FormControls'
import { Modal } from '../components/Modal'

const Login: React.FC = () => {
  const { login, loginAs } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [recoverOpen, setRecoverOpen] = useState(false)
  const [recoverSent, setRecoverSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = login(email, password)
    if (!result.ok) {
      setError(result.message ?? 'Não foi possível entrar.')
      return
    }
    setError('')
    const isAdmin = email.trim().toLowerCase() === 'admin@infohub.com'
    navigate(isAdmin ? '/admin' : '/aluno')
  }

  const quickAccess = (role: 'admin' | 'aluno') => {
    loginAs(role)
    navigate(role === 'admin' ? '/admin' : '/aluno')
  }

  return (
    <div className="grid min-h-screen bg-ink-950 lg:grid-cols-2">
      {/* Lado visual */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-brand-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-grid-faint bg-[size:32px_32px] opacity-40" />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <Compass size={20} className="text-white" />
          </div>
          <span className="font-display text-lg font-bold text-white">InfoHub</span>
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
      <div className="flex items-center justify-center bg-slate-50 px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
              <Compass size={20} className="text-white" />
            </div>
            <span className="font-display text-lg font-bold text-ink-900">InfoHub → InovAMF</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-ink-900">Bem-vindo de volta</h2>
          <p className="mt-1.5 text-sm text-ink-700/60">Entre com sua conta para acompanhar a jornada.</p>

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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-700/40 hover:text-ink-700"
                  aria-label="Mostrar senha"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
            )}

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-1.5 text-ink-700/60">
                <input type="checkbox" className="rounded border-slate-300 text-brand-600 focus:ring-brand-400" />
                Manter conectado
              </label>
              <button
                type="button"
                onClick={() => setRecoverOpen(true)}
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                Recuperar senha
              </button>
            </div>

            <Button type="submit" className="w-full">
              Entrar <ArrowRight size={16} />
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-700/40">Acesso rápido de demonstração</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => quickAccess('admin')}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-brand-300 hover:bg-brand-50"
            >
              <ShieldCheck size={20} className="text-brand-600" />
              <span className="text-xs font-semibold text-ink-900">Entrar como Admin</span>
            </button>
            <button
              onClick={() => quickAccess('aluno')}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-brand-300 hover:bg-brand-50"
            >
              <GraduationCap size={20} className="text-brand-600" />
              <span className="text-xs font-semibold text-ink-900">Entrar como Aluno</span>
            </button>
          </div>

          <p className="mt-6 text-center text-[11px] text-ink-700/40">
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
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
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
