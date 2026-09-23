"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  MailCheck,
  Pencil,
  Plus,
  Power,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import Header from "@/components/Header";
import { CardSkeleton } from "@/components/Skeleton";
import Toast, { type ToastMessage } from "@/components/Toast";
import { api, describeError } from "@/lib/api";
import { ROLE_LABELS, type ApiUserRole, type ApiUserSummary } from "@/lib/api-types";
import { formatDate } from "@/lib/format";
import { useRequireSession } from "@/lib/session";

const PAGE_SIZE = 20;

const inputClass =
  "w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
const selectClass =
  "px-3 py-2 border border-input-border rounded-lg text-sm bg-input-bg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

type ShowToast = (kind: ToastMessage["kind"], text: string) => void;

/** Em que pé está o acesso da pessoa — o que a coordenação precisa saber para destravar alguém. */
function accessState(user: ApiUserSummary): { label: string; tone: string } {
  if (!user.isActive) return { label: "Desativada", tone: "bg-badge-muted-bg text-muted" };
  if (!user.hasPassword) return { label: "Aguardando ativação", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  if (!user.emailConfirmedAt) return { label: "E-mail não confirmado", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  return { label: "Ativa", tone: "bg-green-500/15 text-green-700 dark:text-green-400" };
}

/**
 * RF-03 — contas do sistema. A coordenação cria e edita contas de
 * administrador e mentor (a pessoa recebe o link de ativação por e-mail),
 * desativa e reativa, destrava quem não consegue entrar e faz a exclusão
 * LGPD (RNF-02). Contas de aluno nascem pelo formulário da ideia.
 */
export default function UsuariosPage() {
  const { user, loading } = useRequireSession(["ADMIN"]);
  const [rows, setRows] = useState<ApiUserSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<ApiUserRole | "">("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ApiUserSummary | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast: ShowToast = (kind, text) => setToast({ kind, text });
  const reload = () => setReloadKey((n) => n + 1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .users({
        role: role || undefined,
        isActive: active === "" ? undefined : active === "true",
        search: debouncedSearch || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      .then(
        (result) => {
          if (cancelled) return;
          setRows(result.data);
          setTotal(result.total);
          setError(null);
        },
        (err: unknown) => {
          if (!cancelled) setError(describeError(err, "Não foi possível carregar os usuários. A API está no ar?"));
        },
      );
    return () => {
      cancelled = true;
    };
  }, [user, role, active, debouncedSearch, page, reloadKey]);

  async function run(target: ApiUserSummary, action: () => Promise<{ message?: string } | unknown>, okMessage: string) {
    setBusyId(target.id);
    try {
      const result = (await action()) as { message?: string } | undefined;
      showToast("ok", result?.message ?? okMessage);
      reload();
    } catch (err) {
      showToast("erro", describeError(err, "Não foi possível concluir a ação."));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const target = toDelete;
    setBusyId(target.id);
    try {
      const result = await api.deleteUser(target.id);
      showToast("ok", result.message);
      setToDelete(null);
      reload();
    } catch (err) {
      showToast("erro", describeError(err, "Não foi possível excluir a conta."));
    } finally {
      setBusyId(null);
    }
  }

  if (loading || !user) {
    return (
      <div className="p-6 space-y-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <Header title="Usuários" userName={user.name} subtitle="Contas de administradores, mentores e alunos" />
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-light" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                aria-label="Buscar por nome ou e-mail"
                className="w-full pl-9 pr-4 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-light" />
              <select
                value={role}
                onChange={(event) => {
                  setRole(event.target.value as ApiUserRole | "");
                  setPage(1);
                }}
                aria-label="Perfil"
                className={selectClass}
              >
                <option value="">Todos os perfis</option>
                {(Object.keys(ROLE_LABELS) as ApiUserRole[]).map((value) => (
                  <option key={value} value={value}>
                    {ROLE_LABELS[value]}
                  </option>
                ))}
              </select>
              <select
                value={active}
                onChange={(event) => {
                  setActive(event.target.value as "" | "true" | "false");
                  setPage(1);
                }}
                aria-label="Situação da conta"
                className={selectClass}
              >
                <option value="">Ativas e desativadas</option>
                <option value="true">Só ativas</option>
                <option value="false">Só desativadas</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark"
          >
            <Plus className="w-4 h-4" /> Novo administrador ou mentor
          </button>
        </div>

        {creating && (
          <CreateUserForm
            onCancel={() => setCreating(false)}
            onCreated={(message) => {
              setCreating(false);
              showToast("ok", message);
              reload();
            }}
          />
        )}

        {error && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            <span>{error}</span>
            <button type="button" onClick={reload} className="font-medium underline">
              Tentar novamente
            </button>
          </div>
        )}

        {!rows && !error ? (
          <div className="space-y-3">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-card-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-table-header border-b border-card-border">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Pessoa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Perfil</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Acesso</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase">Desde</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(rows ?? []).map((row) =>
                    editingId === row.id ? (
                      <tr key={row.id} className="border-b border-divider bg-highlight-bg">
                        <td colSpan={5} className="px-4 py-3">
                          <EditUserForm
                            user={row}
                            onCancel={() => setEditingId(null)}
                            onSaved={() => {
                              setEditingId(null);
                              showToast("ok", "Dados atualizados.");
                              reload();
                            }}
                            onToast={showToast}
                          />
                        </td>
                      </tr>
                    ) : (
                      <UserRow
                        key={row.id}
                        row={row}
                        isSelf={row.id === user.id}
                        busy={busyId === row.id}
                        onEdit={() => setEditingId(row.id)}
                        onToggle={() =>
                          void run(row, () => api.setUserStatus(row.id, !row.isActive), row.isActive ? "Conta desativada." : "Conta reativada.")
                        }
                        onResend={() => void run(row, () => api.resendAccess(row.id), "Link reenviado.")}
                        onConfirmEmail={() => void run(row, () => api.confirmUserEmail(row.id), "E-mail confirmado.")}
                        onDelete={() => setToDelete(row)}
                      />
                    ),
                  )}
                </tbody>
              </table>
            </div>
            {rows?.length === 0 && <p className="text-sm text-muted-light text-center py-8">Nenhuma conta encontrada</p>}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between gap-3 border-t border-card-border px-4 py-3 text-sm text-muted">
                <span>
                  {total} contas · página {page} de {pages}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    aria-label="Página anterior"
                    className="rounded-lg border border-input-border p-1.5 hover:bg-hover-bg disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(pages, current + 1))}
                    disabled={page === pages}
                    aria-label="Próxima página"
                    className="rounded-lg border border-input-border p-1.5 hover:bg-hover-bg disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {toDelete && (
        <ConfirmDialog
          title="Excluir os dados desta pessoa?"
          description={
            <>
              <p>
                Exclusão definitiva (LGPD) da conta de <strong>{toDelete.name}</strong>: nome, e-mail, telefone, curso,
                senha e sessões são apagados, e o nome some dos e-mails já enviados. O histórico das equipes fica, sem
                identificar a pessoa.
              </p>
              {toDelete.role === "STUDENT" && (
                <p className="mt-2">
                  Se for líder, outro integrante assume; se for o único integrante, a equipe é excluída.
                </p>
              )}
              <p className="mt-2 font-medium text-foreground">Não dá para desfazer.</p>
            </>
          }
          confirmLabel="Excluir dados"
          busy={busyId === toDelete.id}
          onCancel={() => setToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}

      {toast && <Toast key={toast.text} kind={toast.kind} text={toast.text} onClose={() => setToast(null)} />}
    </div>
  );
}

function UserRow({
  row,
  isSelf,
  busy,
  onEdit,
  onToggle,
  onResend,
  onConfirmEmail,
  onDelete,
}: {
  row: ApiUserSummary;
  isSelf: boolean;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onResend: () => void;
  onConfirmEmail: () => void;
  onDelete: () => void;
}) {
  const state = accessState(row);
  const iconButton =
    "flex h-8 w-8 items-center justify-center rounded-md text-muted-light transition-colors hover:bg-hover-bg disabled:opacity-30";

  return (
    <tr className="border-b border-divider hover:bg-card-hover">
      <td className="min-w-[15rem] px-4 py-3">
        <p className="text-sm font-medium text-foreground">
          {row.name} {isSelf && <span className="text-xs font-normal text-muted-light">(você)</span>}
        </p>
        <p className="text-xs text-muted break-all">{row.email}</p>
        {(row.course || row.phone) && (
          <p className="text-xs text-muted-light">{[row.course, row.semester, row.phone].filter(Boolean).join(" · ")}</p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">
        {ROLE_LABELS[row.role]}
        {row.role === "MENTOR" && (
          <span className="block text-xs text-muted-light">
            {row.mentoredTeams} {row.mentoredTeams === 1 ? "equipe" : "equipes"}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${state.tone}`}>
          {state.label}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">{formatDate(row.createdAt)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-0.5">
          {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin text-muted-light" />}
          {row.isActive && (!row.hasPassword || !row.emailConfirmedAt) && (
            <button
              type="button"
              onClick={onResend}
              disabled={busy}
              title={row.hasPassword ? "Reenviar o link de confirmação do e-mail" : "Reenviar o link de ativação"}
              aria-label={`Reenviar acesso para ${row.name}`}
              className={`${iconButton} hover:text-primary`}
            >
              <Send className="h-4 w-4" />
            </button>
          )}
          {row.isActive && row.hasPassword && !row.emailConfirmedAt && (
            <button
              type="button"
              onClick={onConfirmEmail}
              disabled={busy}
              title="Confirmar o e-mail manualmente (a pessoa não recebeu o link)"
              aria-label={`Confirmar o e-mail de ${row.name}`}
              className={`${iconButton} hover:text-success`}
            >
              <MailCheck className="h-4 w-4" />
            </button>
          )}
          {row.role !== "STUDENT" && (
            <button type="button" onClick={onEdit} disabled={busy} title="Editar" aria-label={`Editar ${row.name}`} className={`${iconButton} hover:text-foreground`}>
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {!isSelf && (
            <button
              type="button"
              onClick={onToggle}
              disabled={busy}
              title={row.isActive ? "Desativar a conta" : "Reativar a conta"}
              aria-label={`${row.isActive ? "Desativar" : "Reativar"} a conta de ${row.name}`}
              className={`${iconButton} ${row.isActive ? "hover:text-danger" : "hover:text-success"}`}
            >
              {row.isActive ? <Power className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </button>
          )}
          {!isSelf && (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              title="Excluir os dados (LGPD)"
              aria-label={`Excluir os dados de ${row.name}`}
              className={`${iconButton} hover:text-danger`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function CreateUserForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (message: string) => void }) {
  const [form, setForm] = useState({ name: "", email: "", role: "MENTOR" as "ADMIN" | "MENTOR", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const invalid = form.name.trim().length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (invalid || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      });
      onCreated(result.message);
    } catch (err) {
      setError(describeError(err, "Não foi possível criar a conta."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="animate-rise mb-4 rounded-xl border-2 border-dashed border-primary/30 bg-highlight-bg p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Nova conta</h2>
          <p className="text-xs text-muted">A pessoa recebe por e-mail o link para criar a senha e aceitar a política de privacidade.</p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Fechar" className="flex h-7 w-7 items-center justify-center rounded-md text-muted-light hover:bg-hover-bg">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          type="text"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="Nome completo"
          aria-label="Nome completo"
          className={`${inputClass} md:col-span-2`}
        />
        <input
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          placeholder="E-mail"
          aria-label="E-mail"
          className={inputClass}
        />
        <select
          value={form.role}
          onChange={(event) => setForm({ ...form, role: event.target.value as "ADMIN" | "MENTOR" })}
          aria-label="Perfil"
          className={inputClass}
        >
          <option value="MENTOR">Mentor</option>
          <option value="ADMIN">Administrador</option>
        </select>
        <input
          type="tel"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
          placeholder="Telefone (opcional)"
          aria-label="Telefone"
          className={`${inputClass} md:col-span-2`}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-muted hover:text-foreground">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={invalid || busy}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-40"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar e enviar convite
        </button>
      </div>
    </form>
  );
}

function EditUserForm({
  user,
  onCancel,
  onSaved,
  onToast,
}: {
  user: ApiUserSummary;
  onCancel: () => void;
  onSaved: () => void;
  onToast: ShowToast;
}) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    role: user.role === "ADMIN" ? ("ADMIN" as const) : ("MENTOR" as const),
  });
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await api.updateUser(user.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
      });
      if (form.email.trim().toLowerCase() !== user.email.toLowerCase() && (!user.hasPassword || !user.emailConfirmedAt)) {
        onToast("ok", "E-mail trocado: o link pendente foi reenviado para o novo endereço.");
      }
      onSaved();
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível salvar."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_2fr_1fr_1fr_auto] md:items-center">
      <input
        type="text"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
        aria-label="Nome"
        className={inputClass}
      />
      <input
        type="email"
        value={form.email}
        onChange={(event) => setForm({ ...form, email: event.target.value })}
        aria-label="E-mail"
        className={inputClass}
      />
      <input
        type="tel"
        value={form.phone}
        onChange={(event) => setForm({ ...form, phone: event.target.value })}
        placeholder="Telefone"
        aria-label="Telefone"
        className={inputClass}
      />
      <select
        value={form.role}
        onChange={(event) => setForm({ ...form, role: event.target.value as "ADMIN" | "MENTOR" })}
        aria-label="Perfil"
        className={inputClass}
      >
        <option value="MENTOR">Mentor</option>
        <option value="ADMIN">Administrador</option>
      </select>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-muted hover:text-foreground">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy || form.name.trim().length < 3}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-40"
        >
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Salvar
        </button>
      </div>
    </form>
  );
}
