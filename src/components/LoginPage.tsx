// Página de entrada com seleção de perfil (Admin ou Aluno) e formulário de login
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthState } from "../types";
import { ADMIN_AUTH, STUDENT_AUTH } from "../data/mockData";

interface Props {
  onLogin: (auth: AuthState) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const navigate = useNavigate();
  const onRegister = () => navigate("/register");

  // Acesso instantâneo para facilitar testes: pula o formulário e loga
  // direto com o perfil de demonstração escolhido.
  function quickLogin(role: "admin" | "student") {
    onLogin(role === "admin" ? ADMIN_AUTH : STUDENT_AUTH);
  }
  // "select" = tela de seleção de perfil | "admin" | "student" = formulário
  const [screen, setScreen] = useState<"select" | "admin" | "student">("select");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Credenciais de demonstração aceitas para qualquer campo
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    // Protótipo: qualquer credencial funciona para demonstração
    if (screen === "admin") onLogin(ADMIN_AUTH);
    else onLogin(STUDENT_AUTH);
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "var(--background)" }}
    >
      {/* ── Painel lateral esquerdo (branding) ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[460px] shrink-0 p-12 relative overflow-hidden"
        style={{ background: "var(--sidebar)" }}
      >
        {/* Ornamento de fundo */}
        <div
          className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "var(--accent)" }}
        />
        <div
          className="absolute top-24 -right-24 w-[300px] h-[300px] rounded-full opacity-5"
          style={{ background: "var(--primary)" }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-white text-lg"
              style={{ background: "var(--accent)" }}
            >
              IH
            </div>
            <div>
              <div className="text-white font-semibold text-lg leading-tight">InfoHub</div>
              <div className="text-xs" style={{ color: "var(--sidebar-foreground)", opacity: 0.6 }}>
                Faculdade Antonio Meneghetti
              </div>
            </div>
          </div>

          <h1
            className="font-display text-4xl font-semibold leading-tight mb-6"
            style={{ color: "var(--sidebar-foreground)" }}
          >
            Do InfoHub <br />
            <em className="not-italic" style={{ color: "var(--accent)" }}>ao InovAMF</em>
          </h1>

          <p className="text-sm leading-relaxed" style={{ color: "var(--sidebar-foreground)", opacity: 0.75 }}>
            Acompanhe a jornada da sua ideia de negócio desde a concepção até o encaminhamento ao
            centro de inovação — com mentoria estruturada e entregas rastreadas em cada etapa.
          </p>
        </div>

        {/* Etapas resumidas */}
        <div className="relative z-10 space-y-3">
          {[
            { n: "01", label: "Envio da ideia" },
            { n: "02", label: "Contato com a equipe" },
            { n: "03–05", label: "Encontros com mentor" },
            { n: "06", label: "Pitch e inscrição no InovAMF" },
          ].map((step) => (
            <div key={step.n} className="flex items-center gap-3">
              <span
                className="text-xs font-mono w-10 shrink-0"
                style={{ color: "var(--accent)" }}
              >
                {step.n}
              </span>
              <span className="text-sm" style={{ color: "var(--sidebar-foreground)", opacity: 0.75 }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Área principal de login ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm"
            style={{ background: "var(--accent)" }}
          >
            IH
          </div>
          <span className="font-display text-2xl font-semibold" style={{ color: "var(--sidebar)" }}>
            InfoHub
          </span>
        </div>

        <div
          className="w-full max-w-md rounded-2xl p-8 shadow-sm border"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          {/* ── Tela de seleção de perfil ── */}
          {screen === "select" && (
            <>
              <h2
                className="font-display text-2xl font-semibold mb-2"
                style={{ color: "var(--foreground)" }}
              >
                Bem-vindo(a)
              </h2>
              <p className="text-sm mb-8" style={{ color: "var(--muted-foreground)" }}>
                Como você quer acessar o InfoHub?
              </p>

              <div className="space-y-3">
                {/* Botão Admin */}
                <button
                  onClick={() => setScreen("admin")}
                  className="w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left group hover:border-current"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--background)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary)";
                    (e.currentTarget as HTMLButtonElement).style.background = "#eff6ff";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--background)";
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "var(--secondary)" }}
                  >
                    {/* ícone admin */}
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--primary)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                      Administrador / Mentor
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      Equipe InfoHub, mentores e coordenação
                    </div>
                  </div>
                </button>

                {/* Botão Aluno */}
                <button
                  onClick={() => setScreen("student")}
                  className="w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--background)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                    (e.currentTarget as HTMLButtonElement).style.background = "#fff7ed";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--background)";
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "#fff7ed" }}
                  >
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "var(--accent)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422A12.083 12.083 0 0112 21.438a12.083 12.083 0 01-6.16-10.86L12 14z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                      Aluno
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      Líder ou integrante de equipe
                    </div>
                  </div>
                </button>
              </div>

              {/* Link para inscrição */}
              <div className="mt-6 pt-6 border-t text-center text-sm" style={{ borderColor: "var(--border)" }}>
                <span style={{ color: "var(--muted-foreground)" }}>Ainda não tem conta? </span>
                <button
                  onClick={onRegister}
                  className="font-semibold hover:underline"
                  style={{ color: "var(--accent)" }}
                >
                  Inscreva sua ideia
                </button>
              </div>

              {/* Acesso rápido para testes: pula credenciais */}
              <div
                className="mt-4 p-3 rounded-lg text-xs flex items-center justify-between gap-2 flex-wrap"
                style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
              >
                <span>
                  <strong>Modo teste:</strong> entre sem preencher formulário
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => quickLogin("admin")}
                    className="px-2.5 py-1 rounded-md font-medium"
                    style={{ background: "var(--primary)", color: "#fff" }}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => quickLogin("student")}
                    className="px-2.5 py-1 rounded-md font-medium"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    Aluno
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Formulário de login ── */}
          {(screen === "admin" || screen === "student") && (
            <>
              <button
                onClick={() => { setScreen("select"); setError(""); }}
                className="flex items-center gap-1.5 text-sm mb-6 hover:underline"
                style={{ color: "var(--muted-foreground)" }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>

              <h2 className="font-display text-2xl font-semibold mb-1" style={{ color: "var(--foreground)" }}>
                {screen === "admin" ? "Acesso administrativo" : "Acesso do aluno"}
              </h2>
              <p className="text-sm mb-8" style={{ color: "var(--muted-foreground)" }}>
                {screen === "admin"
                  ? "Entre com as credenciais da equipe InfoHub."
                  : "Entre com seu e-mail e senha cadastrados."}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                    E-mail institucional
                  </label>
                  <input
                    type="email"
                    placeholder={screen === "admin" ? "infohub@amf.edu.br" : "seu.nome@amf.edu.br"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border text-sm"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--background)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--foreground)" }}>
                    Senha
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border text-sm"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--background)",
                      color: "var(--foreground)",
                    }}
                  />
                </div>

                {error && (
                  <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>
                )}

                <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted-foreground)" }}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    Manter conectado
                  </label>
                  <button type="button" className="hover:underline" style={{ color: "var(--primary)" }}>
                    Esqueci a senha
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg font-semibold text-sm mt-2"
                  style={{ background: screen === "admin" ? "var(--primary)" : "var(--accent)", color: "#fff" }}
                >
                  Entrar
                </button>
              </form>

              {/* hint de demonstração */}
              <div
                className="mt-5 p-3 rounded-lg text-xs"
                style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
              >
                <strong>Demo:</strong> insira qualquer e-mail e senha para acessar.
              </div>

              {screen === "student" && (
                <div className="mt-4 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                  Sem conta?{" "}
                  <button
                    onClick={onRegister}
                    className="font-semibold hover:underline"
                    style={{ color: "var(--accent)" }}
                  >
                    Inscreva sua ideia
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
