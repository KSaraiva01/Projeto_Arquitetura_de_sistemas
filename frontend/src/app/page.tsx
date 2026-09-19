"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Rocket, Users, ClipboardCheck, BarChart3, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import InfoHubLogo from "@/components/InfoHubLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { api, ApiError } from "@/lib/api";
import { homePathFor } from "@/lib/api-types";
import { useSession } from "@/lib/session";

const FEATURES = [
  {
    icon: Rocket,
    title: "Jornada estruturada",
    desc: "6 etapas claras, da ideia ao InovAMF, com orientação em cada passo.",
  },
  {
    icon: Users,
    title: "Mentoria dedicada",
    desc: "Mentores acompanham suas equipes com feedback contínuo e direcionado.",
  },
  {
    icon: ClipboardCheck,
    title: "Tarefas e entregas",
    desc: "Envie entregáveis, receba avaliações e acompanhe prazos em um só lugar.",
  },
  {
    icon: BarChart3,
    title: "Relatórios e visibilidade",
    desc: "Administradores acompanham o progresso de todas as equipes em tempo real.",
  },
];

const STEPS = [
  { number: "01", title: "Inscreva sua ideia", desc: "Cadastre seu projeto e forme sua equipe." },
  { number: "02", title: "Receba orientação", desc: "Mentores guiam sua jornada com tarefas e feedback." },
  { number: "03", title: "Evolua até o InovAMF", desc: "Complete as etapas e apresente no evento de inovação." },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  // Quem já tem sessão ativa vai direto para o painel do seu perfil.
  useEffect(() => {
    if (user) router.replace(homePathFor(user));
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }

    setSubmitting(true);
    try {
      // O destino vem da role devolvida pela API, não de um seletor na tela:
      // quem decide o que a pessoa é são os dados, não o formulário.
      const session = await api.login(email, password);
      await refresh();
      router.replace(homePathFor(session.user));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível conectar à API. Verifique se o backend está rodando.",
      );
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setNotice("");

    if (!email) {
      setError("Informe seu e-mail para receber o link de redefinição.");
      return;
    }

    try {
      const result = await api.forgotPassword(email);
      setNotice(result.message);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível solicitar a redefinição.",
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-card-border">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <InfoHubLogo size="sm" />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="#login"
              className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
            >
              Entrar
            </a>
          </div>
        </div>
      </nav>

      {/* Hero — cada bloco entra 100ms depois do anterior, de cima para
          baixo, e o logo flutua de leve sobre um brilho na cor da marca. */}
      <section className="relative overflow-hidden pt-28 pb-16 px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-10 h-80 w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(245,166,35,0.28),rgba(229,53,37,0.12),transparent)] blur-2xl animate-fade-in"
          style={{ animationDuration: "1200ms" }}
        />
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="animate-rise flex justify-center mb-6" style={{ animationDuration: "480ms" }}>
            <InfoHubLogo size="lg" showTagline />
          </div>
          <div
            className="animate-rise inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-6"
            style={{ animationDelay: "100ms", animationDuration: "480ms" }}
          >
            <Rocket className="w-3.5 h-3.5" />
            Faculdade Antonio Meneghetti
          </div>
          <h1
            className="animate-rise text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4 max-w-3xl mx-auto text-balance"
            style={{ animationDelay: "200ms", animationDuration: "480ms" }}
          >
            Transforme sua ideia em um projeto de{" "}
            <span className="text-primary">inovação</span>
          </h1>
          <p
            className="animate-rise text-lg text-muted max-w-2xl mx-auto mb-8 text-pretty"
            style={{ animationDelay: "300ms", animationDuration: "480ms" }}
          >
            O InfoHub acompanha a jornada do empreendedor desde a concepção da ideia
            até a apresentação no InovAMF, com mentoria, tarefas e relatórios integrados.
          </p>
          <div
            className="animate-rise flex flex-col sm:flex-row items-center justify-center gap-4"
            style={{ animationDelay: "400ms", animationDuration: "480ms" }}
          >
            <a
              href="#login"
              className="group px-6 py-3 bg-primary text-white font-medium rounded-lg transition-[background-color,box-shadow,transform] duration-150 hover:bg-primary-dark hover:shadow-[0_8px_16px_-8px_rgba(229,53,37,0.6)] active:scale-[0.98] inline-flex items-center gap-2"
            >
              Acessar plataforma
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </a>
            <Link
              href="/cadastro"
              className="px-6 py-3 border border-card-border bg-card text-foreground font-medium rounded-lg transition-colors duration-150 hover:bg-hover-bg hover:border-input-border"
            >
              Enviar minha ideia
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 border-t border-card-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-2">
            Tudo que você precisa em um só lugar
          </h2>
          <p className="text-muted text-center mb-12 max-w-xl mx-auto">
            Uma plataforma completa para alunos, mentores e administradores gerenciarem o programa de inovação.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, index) => (
              <div
                key={f.title}
                style={{ animationDelay: `${600 + index * 80}ms` }}
                className="group animate-rise bg-card border border-card-border rounded-xl p-6 transition-[transform,box-shadow,border-color] duration-200 ease-enter hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_16px_32px_-16px_rgba(17,24,39,0.25)]"
              >
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center mb-4 transition-colors duration-200 group-hover:bg-primary group-hover:text-white">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 bg-card border-t border-card-border">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-12">Como funciona</h2>
          <div className="relative">
            {/* Linha que se desenha ligando os três passos (só no
                desktop, onde eles ficam lado a lado). */}
            <svg
              aria-hidden="true"
              viewBox="0 0 896 40"
              className="pointer-events-none absolute left-0 top-0 hidden h-10 w-full md:block"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M150 20 H746"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeLinecap="round"
                className="[stroke-dashoffset:700] [stroke-dasharray:700] animate-[check-draw_1.4s_var(--motion-enter)_900ms_both]"
                pathLength={700}
              />
            </svg>
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
              {STEPS.map((step, index) => (
                <div key={step.number} className="text-center">
                  <div
                    style={{ animationDelay: `${900 + index * 600}ms` }}
                    className="animate-pop mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white ring-[6px] ring-card"
                  >
                    {step.number}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Login section */}
      <section id="login" className="py-16 px-6 border-t border-card-border">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Acesse sua conta</h2>
            <p className="text-sm text-muted">Entre com o e-mail e a senha da sua conta</p>
          </div>

          <div className="animate-rise bg-card rounded-2xl border border-card-border p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-light transition-colors hover:bg-hover-bg hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* A mensagem entra com um tremor curto: chama o olho para o
                  erro sem precisar de cor forte no campo inteiro. A `key`
                  faz o tremor repetir quando o texto muda. */}
              {error && (
                <p key={error} role="alert" className="animate-shake flex items-start gap-1.5 text-sm text-danger">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}
              {notice && (
                <p key={notice} role="status" className="animate-rise text-sm text-success">
                  {notice}
                </p>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" className="rounded border-input-border" />
                  Lembrar-me
                </label>
                <button
                  type="button"
                  onClick={() => void handleForgotPassword()}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  Esqueceu a senha?
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-white py-2.5 rounded-lg font-medium transition-[background-color,transform,box-shadow] duration-150 hover:bg-primary-dark hover:shadow-[0_8px_16px_-8px_rgba(229,53,37,0.6)] active:scale-[0.98] text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:hover:shadow-none"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted">
                Ainda não tem conta?{" "}
                <Link href="/cadastro" className="text-primary hover:text-primary-dark font-medium">
                  Envie sua ideia
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-light mt-6">
            Faculdade Antonio Meneghetti &mdash; InfoHub &rarr; InovAMF
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-card-border bg-card">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <InfoHubLogo size="sm" showTagline />
          <p className="text-xs text-muted-light">
            &copy; {new Date().getFullYear()} Faculdade Antonio Meneghetti. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
