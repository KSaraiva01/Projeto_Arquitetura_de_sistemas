"use client";

import { useState } from "react";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import DueChip from "@/components/DueChip";
import UploadDropzone from "@/components/UploadDropzone";
import { mockTeams, getTasksByTeam } from "@/lib/mock-data";
import { STAGE_NAMES } from "@/lib/types";
import { Upload, FileText, CheckCircle, Clock } from "lucide-react";

export default function IntegranteTarefasPage() {
  const team = mockTeams[0];
  const currentMember = team.members[0];
  const tasks = getTasksByTeam(team.id);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  function handleUpload(taskId: string) {
    if (selectedFiles.length > 0) {
      setUploadSuccess(taskId);
      setUploadingTaskId(null);
      setSelectedFiles([]);
      setTimeout(() => setUploadSuccess(null), 3000);
    }
  }

  const pending = tasks.filter((t) => t.status !== "aprovada");
  const completed = tasks.filter((t) => t.status === "aprovada");

  return (
    <div>
      <Header title="Minhas Tarefas" userName={currentMember?.name ?? team.leader.name} subtitle={`Equipe ${team.ideaName}`} />

      <div className="p-6">
        {uploadSuccess && (
          <div role="status" className="animate-rise bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <p className="text-sm">Arquivo enviado com sucesso!</p>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Pendentes ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <div className="animate-rise bg-card rounded-xl border border-card-border p-8 text-center">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
              <p className="text-muted">Nenhuma tarefa pendente!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((task, index) => (
                <div
                  key={task.id}
                  style={{ animationDelay: `${index * 60}ms` }}
                  className="animate-rise bg-card rounded-xl border border-card-border p-5 transition-[border-color,box-shadow] duration-150 hover:border-primary/30 hover:shadow-[0_6px_16px_-8px_rgba(17,24,39,0.2)]"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-base font-medium text-foreground">{task.title}</h3>
                      <p className="text-sm text-muted mt-0.5">{task.description}</p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-light mb-4">
                    <DueChip dueDate={task.dueDate} />
                    <span>Etapa {task.stage} — {STAGE_NAMES[task.stage]}</span>
                  </div>

                  {task.adminComment && (
                    <div className="bg-amber-500/10 rounded-lg p-3 mb-4">
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        <span className="font-medium">Feedback do mentor:</span> {task.adminComment}
                      </p>
                    </div>
                  )}

                  {task.files.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted mb-2">Arquivos enviados:</p>
                      {[...task.files].sort((a, b) => b.version - a.version).map((f) => (
                        <div key={f.id} className="flex items-center gap-2 text-sm text-muted">
                          <FileText className="w-4 h-4 text-blue-500" />
                          {f.name}
                          <span className="text-xs text-muted-light">v{f.version} — {f.size}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadingTaskId === task.id ? (
                    <UploadDropzone
                      files={selectedFiles}
                      onFilesChange={setSelectedFiles}
                      onSubmit={() => handleUpload(task.id)}
                      onCancel={() => { setUploadingTaskId(null); setSelectedFiles([]); }}
                    />
                  ) : (
                    <button
                      onClick={() => setUploadingTaskId(task.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg transition-[background-color,transform] duration-150 hover:bg-primary-dark active:scale-[0.98]"
                    >
                      <Upload className="w-4 h-4" /> Enviar entrega
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {completed.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Concluídas ({completed.length})
            </h2>
            <div className="animate-rise bg-card rounded-xl border border-card-border overflow-hidden" style={{ animationDelay: "120ms" }}>
              {completed.map((task, index) => (
                <div
                  key={task.id}
                  style={{ animationDelay: `${160 + index * 40}ms` }}
                  className="animate-row-in flex flex-col gap-2 px-5 py-4 border-b border-divider last:border-0 transition-colors hover:bg-card-hover sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{task.title}</p>
                    <p className="text-xs text-muted-light">
                      Etapa {task.stage} — Entregue em {task.files[0]?.uploadedAt ?? task.dueDate}
                    </p>
                  </div>
                  <div className="flex min-w-0 items-center gap-3">
                    {task.files.length > 0 && (
                      <span className="flex min-w-0 items-center gap-1 text-xs text-muted-light">
                        <FileText className="w-3 h-3 shrink-0" />
                        <span className="truncate">{task.files[0].name}</span>
                      </span>
                    )}
                    <StatusBadge status={task.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
