"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import InfoHubLogo from "@/components/InfoHubLogo";
import PasswordRules from "@/components/PasswordRules";
import ThemeToggle from "@/components/ThemeToggle";
import { api, ApiError, describeError } from "@/lib/api";
import { passwordIsValid } from "@/lib/password";

/**
 * Destino dos links `/definir-senha?token=…` dos e-mails (RF-01 e RF-02):
 *
 *  - ativação (`&tipo=ativacao`): o colega que o líder cadastrou — ou a conta
 *    criada pela coordenação — cria a primeira senha e aceita a política de
 *    privacidade (RNF-02);
 *  - recuperação: quem pediu "Esqueci minha senha" cria uma nova.
 *
 * O mesmo endpoint serve aos dois. Se o backend disser que falta o aceite
 * (LGPD_CONSENT_REQUIRED), a caixa aparece mesmo num link sem o `tipo`.
 */
export default function DefinirSenhaPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b border-card-border px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/">
            <InfoHubLogo size="sm" />
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="animate-rise bg-card rounded-2xl shadow-sm border border-card-border p-8 max-w-md w-full">
          {/* useSearchParams precisa de Suspense para a página poder ser pré-renderizada. */}
          <Suspense
            fallback={
              <div role="status" className="py-6 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            }
          >
            <DefinirSenha />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

const inputClass =
  "w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

function DefinirSenha() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const isActivation = params.get("tipo") === "ativacao";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [askConsent, setAskConsent] = useState(isActivation);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [linkInvalid, setLinkInvalid] = useState(!token);
  const [done, setDone] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!passwordIsValid(password)) {
      setError("A senha ainda não cumpre as regras abaixo.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    if (askConsent && !consent) {
      setError("Para ativar a conta, aceite a política de privacidade.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.resetPassword(token, password, askConsent ? consent : undefined);
      setDone(result.message);
    } catch (err) {
      if (err instanceof ApiError && err.code === "LGPD_CONSENT_REQUIRED") {
        setAskConsent(true);
        setError(err.message);
      } else if (err instanceof ApiError && err.code === "INVALID_RESET_TOKEN") {
        setLinkInvalid(true);
        setError(err.message);
      } else {
        setError(describeError(err, "Não foi possível conectar à API. Tente de novo em instantes."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Tudo certo!</h1>
        <p className="text-muted mb-6">{done}</p>
        <Link
          href="/#login"
          className="inline-block bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors text-sm"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  if (linkInvalid) {
    return <NovoLink message={error || "Link incompleto. Abra o link exatamente como ele chegou no seu e-mail."} />;
  }

  return (
    <>
      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
        <KeyRound className="w-6 h-6 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-1">
        {isActivation ? "Ative sua conta" : "Crie uma nova senha"}
      </h1>
      <p className="text-sm text-muted mb-6">
        {isActivation
          ? "Crie a senha que você vai usar para entrar no InfoHub."
          : "Escolha a nova senha da sua conta. Depois disso, entre com ela."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-foreground mb-1.5">
            Senha
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-light transition-colors hover:bg-hover-bg hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PasswordRules value={password} />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground mb-1.5">
            Confirme a senha
          </label>
          <input
            id="confirm-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className={inputClass}
          />
        </div>

        {askConsent && (
          <label className="animate-fade-in flex items-start gap-3 rounded-lg bg-highlight-bg p-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span className="text-sm text-muted">
              Li e concordo com a{" "}
              <Link href="/privacidade" target="_blank" className="font-medium text-primary hover:text-primary-dark">
                política de privacidade
              </Link>{" "}
              e com o tratamento dos meus dados pelo InfoHub para o acompanhamento da jornada (LGPD).
            </span>
          </label>
        )}

        {error && (
          <p key={error} role="alert" className="animate-shake flex items-start gap-1.5 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Salvando..." : isActivation ? "Ativar minha conta" : "Salvar nova senha"}
        </button>
      </form>
    </>
  );
}

/** Link vencido, já usado ou incompleto: a própria página pede um novo. */
function NovoLink({ message }: { message: string }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setNotice("");
    setError("");
    if (!email) {
      setError("Informe o e-mail da sua conta.");
      return;
    }
    setSending(true);
    try {
      // Conta ainda sem senha recebe um novo link de ativação; as demais, o de recuperação.
      const result = await api.forgotPassword(email);
      setNotice(result.message);
    } catch (err) {
      setError(describeError(err, "Não foi possível pedir um novo link. Tente de novo em instantes."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-danger" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Este link não vale mais</h1>
      <p className="text-muted mb-6">{message}</p>

      <form onSubmit={handleSubmit} className="space-y-3 text-left">
        <label htmlFor="new-link-email" className="block text-sm font-medium text-foreground">
          Receber um novo link
        </label>
        <input
          id="new-link-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="E-mail da sua conta"
          className={inputClass}
        />
        {error && (
          <p key={error} role="alert" className="animate-shake text-sm text-danger">
            {error}
          </p>
        )}
        {notice && (
          <p key={notice} role="status" className="animate-rise text-sm text-success">
            {notice}
          </p>
        )}
        <button
          type="submit"
          disabled={sending}
          className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {sending && <Loader2 className="w-4 h-4 animate-spin" />}
          {sending ? "Enviando..." : "Enviar novo link"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Lembrou a senha?{" "}
        <Link href="/#login" className="text-primary hover:text-primary-dark font-medium">
          Entrar
        </Link>
      </p>
    </div>
  );
}
