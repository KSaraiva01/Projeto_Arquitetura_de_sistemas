"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Loader2, PackageCheck } from "lucide-react";
import { TaskStatusBadge } from "./StatusBadge";
import type { ApiFinalDeliverable } from "@/lib/api-types";
import { todayIso } from "@/lib/format";

/**
 * RN-02 — os entregáveis finais obrigatórios (Pitch Vídeo, Canvas final, VPD
 * final e dados dos integrantes). A equipe só fica "pronta para o InovAMF"
 * com todos aprovados. Para admin/mentor, `onCreateMissing` cria de uma vez
 * as tarefas que ainda não existem, a partir dos modelos da etapa 6.
 */
export default function FinalDeliverablesCard({
  deliverables,
  onCreateMissing,
}: {
  deliverables: ApiFinalDeliverable[];
  onCreateMissing?: (dueDate: string, templateIds: string[]) => Promise<void>;
}) {
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);

  if (deliverables.length === 0) return null;

  const missing = deliverables.filter((item) => item.taskId === null);
  const approved = deliverables.filter((item) => item.status === "APPROVED").length;

  async function create() {
    if (!onCreateMissing || !dueDate || busy) return;
    setBusy(true);
    try {
      await onCreateMissing(dueDate, missing.map((item) => item.templateId));
      setDueDate("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-card rounded-xl border border-card-border p-5">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <PackageCheck className="w-4 h-4 text-primary" /> Entregáveis finais
      </h3>
      <p className="mt-1 mb-3 text-xs text-muted">
        {approved} de {deliverables.length} aprovados — todos precisam estar aprovados para a equipe ficar pronta para o
        InovAMF.
      </p>
      <ul className="space-y-2">
        {deliverables.map((item) => (
          <li key={item.templateId} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {item.status === "APPROVED" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-light" />
              )}
              <span className="truncate text-foreground">{item.title}</span>
            </span>
            {item.status ? (
              <TaskStatusBadge status={item.status} />
            ) : (
              <span className="shrink-0 text-xs text-muted-light">ainda não criada</span>
            )}
          </li>
        ))}
      </ul>

      {onCreateMissing && missing.length > 0 && (
        <div className="mt-4 space-y-2 rounded-lg bg-highlight-bg p-3">
          <label htmlFor="final-deliverables-due" className="block text-xs text-muted">
            Criar {missing.length === 1 ? "a tarefa que falta" : `as ${missing.length} tarefas que faltam`} com prazo em
          </label>
          <div className="flex gap-2">
            <input
              id="final-deliverables-due"
              type="date"
              min={todayIso()}
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="min-w-0 flex-1 px-3 py-1.5 bg-input-bg border border-input-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => void create()}
              disabled={!dueDate || busy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-dark disabled:opacity-40"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Criar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
