"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Bell, KeyRound, Loader2, ShieldAlert, UserRound } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import Header from "./Header";
import PasswordRules from "./PasswordRules";
import { CardSkeleton } from "./Skeleton";
import Toast, { type ToastMessage } from "./Toast";
import { api, ApiError, describeError } from "@/lib/api";
import { ROLE_LABELS, type ApiNotificationType, type ApiSessionUser } from "@/lib/api-types";
import { formatDate } from "@/lib/format";
import { passwordIsValid } from "@/lib/password";
import { useRequireSession, useSession } from "@/lib/session";

const inputClass =
  "w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Avisos que cada perfil recebe — e pode desligar (RF-21). E-mails de segurança da conta não entram aqui. */
const NOTIFICATIONS: Record<ApiSessionUser["role"], Array<{ type: ApiNotificationType; label: string; hint: string }>> = {
  STUDENT: [
    { type: "NOVA_TAREFA", label: "Nova tarefa", hint: "quando o mentor atribui uma tarefa à equipe" },
    { type: "PRAZO_PROXIMO", label: "Prazo se aproximando", hint: "os lembretes configurados em cada tarefa" },
    { type: "PRAZO_VENCIDO", label: "Prazo vencido", hint: "quando uma tarefa vence sem entrega" },
    { type: "ENTREGA_AVALIADA", label: "Entrega avaliada", hint: "aprovação ou pedido de ajustes" },
    { type: "LEMBRETE_MANUAL", label: "Recados da coordenação", hint: "lembretes enviados pelo mentor ou pela coordenação" },
  ],
  MENTOR: [
    { type: "ENTREGA_RECEBIDA", label: "Entrega recebida", hint: "quando uma equipe sua envia um arquivo" },
    { type: "TAREFA_ATRASADA", label: "Tarefa atrasada", hint: "quando uma tarefa de equipe sua vence sem entrega" },
  ],
  ADMIN: [
    { type: "NOVO_CADASTRO", label: "Nova ideia cadastrada", hint: "quando um aluno envia o formulário" },
    { type: "ENTREGA_RECEBIDA", label: "Entrega recebida", hint: "quando qualquer equipe envia um arquivo" },
    { type: "TAREFA_ATRASADA", label: "Tarefa atrasada", hint: "quando uma tarefa vence sem entrega" },
  ],
};

/**
 * Minha conta — o mesmo painel para todos os perfis: os próprios dados,
 * troca de senha, os avisos por e-mail que a pessoa quer receber (RF-21) e
 * a exclusão da conta (RNF-02, LGPD).
 */
export default function AccountSettings({ role }: { role: ApiSessionUser["role"] }) {
  const { user, loading } = useRequireSession([role]);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const showToast = (kind: ToastMessage["kind"], text: string) => setToast({ kind, text });

  if (loading || !user) {
    return (
      <div className="p-6 space-y-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div>
      <Header title="Minha conta" userName={user.name} subtitle="Seus dados, senha, avisos por e-mail e privacidade" />
      <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <ProfileCard user={user} />
        <ChangePasswordCard />
        <NotificationsCard role={user.role} onToast={showToast} />
        <DeleteAccountCard user={user} onToast={showToast} />
      </div>
      {toast && <Toast key={toast.text} kind={toast.kind} text={toast.text} onClose={() => setToast(null)} />}
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="animate-rise bg-card rounded-xl border border-card-border p-6">
      <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function ProfileCard({ user }: { user: ApiSessionUser }) {
  const rows = [
    { label: "Nome", value: user.name },
    { label: "E-mail", value: user.email },
    { label: "Perfil", value: ROLE_LABELS[user.role] },
    ...(user.phone ? [{ label: "Telefone", value: user.phone }] : []),
    ...(user.course ? [{ label: "Curso", value: [user.course, user.semester].filter(Boolean).join(" · ") }] : []),
    ...(user.teams.length
      ? [{ label: "Equipe", value: user.teams.map((team) => `${team.name} (${team.memberRole === "LEADER" ? "líder" : "integrante"})`).join(", ") }]
      : []),
    { label: "Conta criada em", value: formatDate(user.createdAt) },
  ];

  return (
    <Card icon={<UserRound className="w-5 h-5 text-muted-light" />} title="Seus dados">
      <dl className="space-y-3 text-sm">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs text-muted-light">{row.label}</dt>
            <dd className="text-foreground break-words">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-muted">
        Algum dado errado? Peça a correção à coordenação do InfoHub. Veja como tratamos seus dados na{" "}
        <Link href="/privacidade" className="text-primary hover:text-primary-dark">
          política de privacidade
        </Link>
        .
      </p>
    </Card>
  );
}

function ChangePasswordCard() {
  const router = useRouter();
  const { refresh } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changed, setChanged] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!current) return setError("Informe a senha atual.");
    if (!passwordIsValid(next)) return setError("A nova senha ainda não cumpre as regras.");
    if (next !== confirmation) return setError("A confirmação não bate com a nova senha.");
    if (next === current) return setError("A nova senha precisa ser diferente da atual.");

    setBusy(true);
    try {
      const result = await api.changePassword(current, next);
      setChanged(result.message);
    } catch (err) {
      setError(describeError(err, "Não foi possível trocar a senha."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card icon={<KeyRound className="w-5 h-5 text-muted-light" />} title="Trocar senha">
      {/* Todas as sessões foram encerradas: a pessoa entra de novo com a nova senha. */}
      {changed && (
        <div role="alertdialog" aria-modal="true" className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="animate-dialog-in w-full max-w-sm rounded-2xl border border-card-border bg-card p-6 text-center shadow-xl">
            <h2 className="text-base font-semibold text-foreground">Senha alterada</h2>
            <p className="mt-2 text-sm text-muted">{changed}</p>
            <button
              type="button"
              onClick={() => {
                void refresh().then(() => router.replace("/#login"));
              }}
              className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark"
            >
              Entrar de novo
            </button>
          </div>
        </div>
      )}
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          placeholder="Senha atual"
          aria-label="Senha atual"
          className={inputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          placeholder="Nova senha"
          aria-label="Nova senha"
          className={inputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="Confirme a nova senha"
          aria-label="Confirme a nova senha"
          className={inputClass}
        />
        <PasswordRules value={next} />
        {error && (
          <p key={error} role="alert" className="animate-shake flex items-start gap-1.5 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        <p className="text-xs text-muted-light">Por segurança, todas as suas sessões são encerradas e você entra de novo.</p>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Trocar senha
          </button>
        </div>
      </form>
    </Card>
  );
}

/** RF-21 — cada aviso ligado ou desligado. Sem registro salvo, o aviso vem ligado. */
function NotificationsCard({
  role,
  onToast,
}: {
  role: ApiSessionUser["role"];
  onToast: (kind: ToastMessage["kind"], text: string) => void;
}) {
  const options = NOTIFICATIONS[role];
  const [enabled, setEnabled] = useState<Record<string, boolean> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.notificationPreferences().then(
      (result) => {
        if (cancelled) return;
        const saved = new Map(result.data.map((preference) => [preference.type, preference.enabled]));
        setEnabled(Object.fromEntries(NOTIFICATIONS[role].map((option) => [option.type, saved.get(option.type) ?? true])));
      },
      (err: unknown) => {
        if (!cancelled) setError(describeError(err, "Não foi possível carregar suas preferências."));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [role]);

  async function save() {
    if (!enabled) return;
    setBusy(true);
    try {
      await api.saveNotificationPreferences(options.map((option) => ({ type: option.type, enabled: enabled[option.type] ?? true })));
      onToast("ok", "Preferências de aviso salvas.");
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível salvar as preferências."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card icon={<Bell className="w-5 h-5 text-muted-light" />} title="Avisos por e-mail">
      {error && <p className="text-sm text-danger">{error}</p>}
      {!enabled && !error && (
        <p className="flex items-center gap-2 text-sm text-muted-light">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </p>
      )}
      {enabled && (
        <>
          <ul className="space-y-3">
            {options.map((option) => (
              <li key={option.type}>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={enabled[option.type] ?? true}
                    onChange={(event) => setEnabled({ ...enabled, [option.type]: event.target.checked })}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span>
                    <span className="block text-sm text-foreground">{option.label}</span>
                    <span className="block text-xs text-muted">{option.hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-light">
            E-mails de segurança (ativação, confirmação e recuperação de senha) chegam sempre.
          </p>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar avisos
            </button>
          </div>
        </>
      )}
    </Card>
  );
}

/** RNF-02 — o próprio usuário pede a exclusão dos dados, confirmando a senha. */
function DeleteAccountCard({
  user,
  onToast,
}: {
  user: ApiSessionUser;
  onToast: (kind: ToastMessage["kind"], text: string) => void;
}) {
  const router = useRouter();
  const { refresh } = useSession();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleted, setDeleted] = useState<string | null>(null);
  const isLeader = user.teams.some((team) => team.memberRole === "LEADER");

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const result = await api.deleteAccount(password);
      setOpen(false);
      setDeleted(result.message);
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "INVALID_CREDENTIALS"
          ? "Senha incorreta."
          : describeError(err, "Não foi possível excluir a conta."),
      );
      if (!(err instanceof ApiError && err.code === "INVALID_CREDENTIALS")) {
        onToast("erro", describeError(err, "Não foi possível excluir a conta."));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card icon={<ShieldAlert className="w-5 h-5 text-danger" />} title="Excluir minha conta">
      <p className="text-sm text-muted">
        Seus dados pessoais (nome, e-mail, telefone, curso, senha e sessões) são apagados e seu nome some dos e-mails já
        enviados. O que a equipe produziu continua com ela, sem identificar você.
        {isLeader && " Como você é o líder, outro integrante assume a liderança (se não houver outro, a equipe é excluída)."}
      </p>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setPassword("");
            setError("");
          }}
          className="rounded-lg border border-danger/40 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/5"
        >
          Excluir minha conta
        </button>
      </div>

      {open && (
        <ConfirmDialog
          title="Excluir sua conta?"
          description="Não dá para desfazer. Para confirmar, digite sua senha."
          confirmLabel="Excluir definitivamente"
          busy={busy}
          confirmDisabled={!password}
          onCancel={() => setOpen(false)}
          onConfirm={() => void remove()}
        >
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Sua senha"
            aria-label="Sua senha"
            className={inputClass}
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </ConfirmDialog>
      )}

      {/* Conta já excluída: o aviso fica até a pessoa sair (a sessão acabou junto). */}
      {deleted && (
        <div role="alertdialog" aria-modal="true" className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="animate-dialog-in w-full max-w-sm rounded-2xl border border-card-border bg-card p-6 text-center shadow-xl">
            <h2 className="text-base font-semibold text-foreground">Conta excluída</h2>
            <p className="mt-2 text-sm text-muted">{deleted}</p>
            <button
              type="button"
              onClick={() => {
                void refresh().then(() => router.replace("/"));
              }}
              className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
