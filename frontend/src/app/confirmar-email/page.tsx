"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import InfoHubLogo from "@/components/InfoHubLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { api, ApiError } from "@/lib/api";

type ConfirmState =
  | { kind: "confirming" }
  | { kind: "confirmed"; message: string }
  | { kind: "error"; message: string };

/**
 * Validação do e-mail — destino do link `/confirmar-email?token=…` que o
 * líder recebe ao cadastrar a ideia. A confirmação acontece assim que a
 * página abre; se o link expirou, dá para pedir outro ali mesmo.
 */
export default function ConfirmarEmailPage() {
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
        <div className="animate-rise bg-card rounded-2xl shadow-sm border border-card-border p-8 max-w-md w-full text-center">
          {/* useSearchParams precisa de Suspense para a página poder ser pré-renderizada. */}
          <Suspense fallback={<Confirming />}>
            <ConfirmEmail />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function ConfirmEmail() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<ConfirmState>(
    token
      ? { kind: "confirming" }
      : { kind: "error", message: "Link incompleto. Abra o link exatamente como ele chegou no seu e-mail." },
  );
  // Em desenvolvimento o React roda o efeito duas vezes; a confirmação sai uma só.
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;

    api
      .confirmEmail(token)
      .then((result) => setState({ kind: "confirmed", message: result.message }))
      .catch((err: unknown) =>
        setState({
          kind: "error",
          message:
            err instanceof ApiError ? err.message : "Não foi possível conectar à API. Tente de novo em instantes.",
        }),
      );
  }, [token]);

  if (state.kind === "confirming") return <Confirming />;

  if (state.kind === "confirmed") {
    return (
      <>
        <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Tudo certo!</h1>
        <p className="text-muted mb-6">{state.message}</p>
        <Link
          href="/#login"
          className="inline-block bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors text-sm"
        >
          Ir para o login
        </Link>
      </>
    );
  }

  return <InvalidLink message={state.message} />;
}

function Confirming() {
  return (
    <div role="status" className="py-6 flex flex-col items-center gap-3 text-muted">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      Confirmando seu e-mail...
    </div>
  );
}

/** Link expirado ou inválido: a própria página pede um novo. */
function InvalidLink({ message }: { message: string }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setNotice("");
    setError("");

    if (!email) {
      setError("Informe o e-mail usado no cadastro.");
      return;
    }

    setSending(true);
    try {
      const result = await api.resendConfirmation(email);
      setNotice(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível pedir um novo link. Tente de novo em instantes.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-danger" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Não deu para confirmar</h1>
      <p className="text-muted mb-6">{message}</p>

      <form onSubmit={handleResend} className="space-y-3 text-left">
        <label htmlFor="confirmation-email" className="block text-sm font-medium text-foreground">
          Receber um novo link
        </label>
        <input
          id="confirmation-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail usado no cadastro"
          className="w-full px-4 py-2.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
        Já confirmou?{" "}
        <Link href="/#login" className="text-primary hover:text-primary-dark font-medium">
          Entrar
        </Link>
      </p>
    </>
  );
}
