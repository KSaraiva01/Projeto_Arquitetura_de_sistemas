"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { api, describeError } from "@/lib/api";
import type { ApiTask, ApiTaskReminder } from "@/lib/api-types";
import { formatDateTime, isoDay, todayIso } from "@/lib/format";

type ShowToast = (kind: "ok" | "erro", text: string) => void;

const inputClass =
  "w-full px-3 py-2 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

function reminderLabel(reminder: ApiTaskReminder) {
  if (reminder.daysBefore === null) return "Data fixa";
  if (reminder.daysBefore === 0) return "No dia do prazo";
  return `${reminder.daysBefore} ${reminder.daysBefore === 1 ? "dia" : "dias"} antes`;
}

/**
 * Edição de uma tarefa pelo mentor/admin (RF-12) e os lembretes dela (RF-17).
 * Mudar o prazo leva junto os lembretes "N dias antes" — inclusive os que já
 * tinham saído, se a nova data ainda está por vir (nota da RF-17).
 */
export default function TaskEditor({
  task,
  onClose,
  onChanged,
  onToast,
}: {
  task: ApiTask;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onToast: ShowToast;
}) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? "",
    dueDate: isoDay(task.dueDate),
    isMandatory: task.isMandatory,
  });
  const [reminders, setReminders] = useState<ApiTaskReminder[] | null>(null);
  const [newReminder, setNewReminder] = useState<{ mode: "days" | "date"; days: string; date: string }>({
    mode: "days",
    days: "2",
    date: "",
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.task(task.id).then(
      (result) => {
        if (!cancelled) setReminders(result.task.reminders);
      },
      (err: unknown) => {
        if (!cancelled) onToast("erro", describeError(err, "Não foi possível carregar os lembretes."));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [task.id, onToast]);

  const dueChanged = form.dueDate !== isoDay(task.dueDate);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (form.title.trim().length < 3 || !form.dueDate || busy) return;
    const changes = {
      ...(form.title.trim() !== task.title ? { title: form.title.trim() } : {}),
      ...(form.description.trim() !== (task.description ?? "") ? { description: form.description.trim() || null } : {}),
      ...(dueChanged ? { dueDate: form.dueDate } : {}),
      ...(form.isMandatory !== task.isMandatory ? { isMandatory: form.isMandatory } : {}),
    };
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    setBusy("save");
    try {
      const result = await api.updateTask(task.id, changes);
      setReminders(result.task.reminders);
      onToast("ok", dueChanged ? "Tarefa salva. Os lembretes acompanharam o novo prazo." : "Tarefa salva.");
      await onChanged();
      onClose();
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível salvar a tarefa."));
    } finally {
      setBusy(null);
    }
  }

  async function addReminder() {
    const days = Number.parseInt(newReminder.days, 10);
    if (newReminder.mode === "days" && (!Number.isInteger(days) || days < 0 || days > 60)) {
      onToast("erro", "Informe de 0 a 60 dias antes do prazo.");
      return;
    }
    if (newReminder.mode === "date" && !newReminder.date) {
      onToast("erro", "Escolha a data do lembrete.");
      return;
    }
    const input = newReminder.mode === "days" ? { daysBefore: days } : { remindAt: newReminder.date };
    setBusy("add");
    try {
      const result = await api.addReminder(task.id, input);
      setReminders(result.task.reminders);
      onToast("ok", "Lembrete agendado.");
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível agendar o lembrete."));
    } finally {
      setBusy(null);
    }
  }

  async function removeReminder(reminderId: string) {
    setBusy(reminderId);
    try {
      await api.removeReminder(task.id, reminderId);
      setReminders((current) => (current ?? []).filter((reminder) => reminder.id !== reminderId));
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível remover o lembrete."));
    } finally {
      setBusy(null);
    }
  }

  async function deleteTask() {
    setBusy("delete");
    try {
      await api.deleteTask(task.id);
      onToast("ok", `Tarefa “${task.title}” excluída.`);
      await onChanged();
      onClose();
    } catch (err) {
      onToast("erro", describeError(err, "Não foi possível excluir a tarefa."));
      setBusy(null);
    }
  }

  return (
    <div className="animate-rise mt-3 space-y-4 rounded-lg border-2 border-dashed border-primary/30 bg-highlight-bg p-4">
      <form onSubmit={save} className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-sm font-semibold text-foreground">Editar tarefa</h4>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar edição"
            className="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-light hover:bg-hover-bg hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          type="text"
          value={form.title}
          maxLength={160}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          aria-label="Título da tarefa"
          className={inputClass}
        />
        <textarea
          value={form.description}
          maxLength={5000}
          rows={3}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          placeholder="Descrição e instruções..."
          aria-label="Descrição da tarefa"
          className={`${inputClass} resize-none`}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
          <div>
            <label htmlFor={`due-${task.id}`} className="mb-1 block text-xs text-muted">
              Prazo de entrega
            </label>
            <input
              id={`due-${task.id}`}
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={form.isMandatory}
              onChange={(event) => setForm({ ...form, isMandatory: event.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            Obrigatória para a equipe avançar de etapa
          </label>
        </div>
        {dueChanged && (
          <p className="text-xs text-muted">
            Os lembretes “N dias antes” vão para as datas do novo prazo — os que já tinham saído voltam a valer se a nova
            data ainda não chegou. Se o prazo ficar no futuro, uma tarefa atrasada volta a pendente.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {task.submissionCount === 0 ? (
            confirmDelete ? (
              <span className="flex items-center gap-2 text-xs">
                <span className="text-foreground">Excluir esta tarefa?</span>
                <button type="button" onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-muted hover:text-foreground">
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => void deleteTask()}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1 rounded-md bg-danger px-2.5 py-1 font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {busy === "delete" && <Loader2 className="h-3 w-3 animate-spin" />}
                  Excluir
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-danger hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir tarefa
              </button>
            )
          ) : (
            <span className="text-xs text-muted-light">Tarefa com entregas não pode ser excluída.</span>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-foreground">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={form.title.trim().length < 3 || !form.dueDate || busy !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-dark disabled:opacity-40"
            >
              {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Salvar
            </button>
          </div>
        </div>
      </form>

      <div className="border-t border-divider pt-3">
        <h5 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <BellRing className="h-3.5 w-3.5" /> Lembretes por e-mail
        </h5>
        {!reminders ? (
          <p className="flex items-center gap-2 text-xs text-muted-light">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...
          </p>
        ) : reminders.length === 0 ? (
          <p className="text-xs text-muted-light">Nenhum lembrete — os integrantes não recebem aviso antes do prazo.</p>
        ) : (
          <ul className="space-y-1.5">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 text-foreground">
                  {reminderLabel(reminder)}
                  <span className="text-xs text-muted-light"> · {formatDateTime(reminder.remindAt)}</span>
                </span>
                {reminder.sentAt ? (
                  <span className="shrink-0 text-xs text-success">enviado</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void removeReminder(reminder.id)}
                    disabled={busy !== null}
                    aria-label={`Remover o lembrete de ${formatDateTime(reminder.remindAt)}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-light hover:bg-hover-bg hover:text-danger disabled:opacity-40"
                  >
                    {busy === reminder.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={newReminder.mode}
            onChange={(event) => setNewReminder({ ...newReminder, mode: event.target.value as "days" | "date" })}
            aria-label="Tipo de lembrete"
            className="px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="days">Dias antes do prazo</option>
            <option value="date">Numa data</option>
          </select>
          {newReminder.mode === "days" ? (
            <input
              type="number"
              min={0}
              max={60}
              value={newReminder.days}
              onChange={(event) => setNewReminder({ ...newReminder, days: event.target.value })}
              aria-label="Quantos dias antes do prazo"
              className="w-20 px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          ) : (
            <input
              type="date"
              min={todayIso()}
              value={newReminder.date}
              onChange={(event) => setNewReminder({ ...newReminder, date: event.target.value })}
              aria-label="Data do lembrete"
              className="px-2 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
          <button
            type="button"
            onClick={() => void addReminder()}
            disabled={busy !== null}
            className="inline-flex items-center gap-1 rounded-lg border border-input-border px-3 py-1.5 text-sm text-foreground hover:bg-hover-bg disabled:opacity-40"
          >
            {busy === "add" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Agendar
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-light">Os lembretes saem às 9h do dia marcado.</p>
      </div>
    </div>
  );
}
