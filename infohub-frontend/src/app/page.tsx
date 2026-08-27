"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Rocket, Users, ClipboardCheck, BarChart3, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import InfoHubLogo from "@/components/InfoHubLogo";
import ThemeToggle from "@/components/ThemeToggle";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"admin" | "aluno" | "mentor">("aluno");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Preencha todos os campos.");
      return;
    }

    router.push(`/${role}`);
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

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-6">
            <Rocket className="w-3.5 h-3.5" />
            Faculdade Antonio Meneghetti
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-4 max-w-3xl mx-auto">
            Transforme sua ideia em um projeto de{" "}
            <span className="text-primary">inovação</span>
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto mb-8">
            O InfoHub acompanha a jornada do empreendedor desde a concepção da ideia
            até a apresentação no InovAMF, com mentoria, tarefas e relatórios integrados.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="#login"
              className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors inline-flex items-center gap-2"
            >
              Acessar plataforma <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/cadastro"
              className="px-6 py-3 border border-card-border text-foreground font-medium rounded-lg hover:bg-hover-bg transition-colors"
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
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-card border border-card-border rounded-xl p-6 hover:border-primary/30 transition-colors"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="text-center">
                <div className="text-3xl font-bold text-primary/20 mb-2">{step.number}</div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Login section */}
      <section id="login" className="py-16 px-6 border-t border-card-border">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Acesse sua conta</h2>
            <p className="text-sm text-muted">Selecione seu perfil e entre na plataforma</p>
          </div>

          <div className="bg-card rounded-2xl border border-card-border p-8 shadow-sm">
            <div className="flex bg-hover-bg rounded-lg p-1 mb-6">
              {(["aluno", "mentor", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    role === r
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted"
                  }`}
                >
                  {r === "aluno" ? "Aluno" : r === "mentor" ? "Mentor" : "Administrador"}
                </button>
              ))}
            </div>

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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-light hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-danger">{error}</p>}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" className="rounded border-input-border" />
                  Lembrar-me
                </label>
                <button type="button" className="text-sm text-primary hover:text-primary-dark">
                  Esqueceu a senha?
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors text-sm"
              >
                Entrar
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
          <InfoHubLogo size="sm" />
          <p className="text-xs text-muted-light">
            &copy; {new Date().getFullYear()} Faculdade Antonio Meneghetti. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
