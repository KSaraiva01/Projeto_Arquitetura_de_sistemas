"use client";

import { useState } from "react";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { mockTeams, getTasksByTeam } from "@/lib/mock-data";
import { STAGE_NAMES } from "@/lib/types";
import { Calendar, Upload, FileText, CheckCircle, Clock, X } from "lucide-react";

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
          <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
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
            <div className="bg-card rounded-xl border border-card-border p-8 text-center">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
              <p className="text-muted">Nenhuma tarefa pendente!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((task) => (
                <div key={task.id} className="bg-card rounded-xl border border-card-border p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-base font-medium text-foreground">{task.title}</h3>
                      <p className="text-sm text-muted mt-0.5">{task.description}</p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-light mb-4">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Prazo: {task.dueDate}</span>
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
                    <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 bg-highlight-bg">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-foreground">Enviar entrega</p>
                        <button onClick={() => { setUploadingTaskId(null); setSelectedFiles([]); }} className="text-muted-light hover:text-foreground">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <label className="block cursor-pointer">
                        <div className="flex flex-col items-center gap-2 py-4">
                          <Upload className="w-8 h-8 text-muted-light" />
                          <p className="text-sm text-muted">Clique para selecionar arquivos</p>
                          <p className="text-xs text-muted-light">PDF, imagens ou vídeos (máx. 100MB)</p>
                        </div>
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => setSelectedFiles(Array.from(e.target.files ?? []))}
                        />
                      </label>
                      {selectedFiles.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {selectedFiles.map((f, i) => (
                            <p key={i} className="text-sm text-muted flex items-center gap-1">
                              <FileText className="w-3 h-3" /> {f.name}
                            </p>
                          ))}
                          <button
                            onClick={() => handleUpload(task.id)}
                            className="mt-2 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark"
                          >
                            Enviar
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setUploadingTaskId(task.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark"
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
            <div className="bg-card rounded-xl border border-card-border overflow-hidden">
              {completed.map((task) => (
                <div key={task.id} className="flex items-center justify-between px-5 py-4 border-b border-divider last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{task.title}</p>
                    <p className="text-xs text-muted-light">
                      Etapa {task.stage} — Entregue em {task.files[0]?.uploadedAt ?? task.dueDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {task.files.length > 0 && (
                      <span className="text-xs text-muted-light flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {task.files[0].name}
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
