"use client";

import { useState } from "react";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { mockTeams, getTasksByTeam } from "@/lib/mock-data";
import { STAGE_NAMES } from "@/lib/types";
import { Calendar, Upload, FileText, CheckCircle, Clock, X } from "lucide-react";

export default function AlunoTarefasPage() {
  const team = mockTeams[0];
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
      <Header title="Minhas Tarefas" userName={team.leader.name} subtitle={`Equipe ${team.ideaName}`} />

      <div className="p-6">
        {uploadSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <p className="text-sm">Arquivo enviado com sucesso!</p>
          </div>
        )}

        {/* Pending */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Pendentes ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
              <p className="text-gray-500">Nenhuma tarefa pendente!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map((task) => (
                <div key={task.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-base font-medium text-gray-800">{task.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Prazo: {task.dueDate}
                    </span>
                    <span>Etapa {task.stage} — {STAGE_NAMES[task.stage]}</span>
                  </div>

                  {task.adminComment && (
                    <div className="bg-orange-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-orange-700">
                        <span className="font-medium">Feedback do mentor:</span> {task.adminComment}
                      </p>
                    </div>
                  )}

                  {task.files.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Arquivos enviados:</p>
                      {task.files.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="w-4 h-4 text-blue-500" />
                          {f.name}
                          <span className="text-xs text-gray-400">v{f.version} — {f.size}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadingTaskId === task.id ? (
                    <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 bg-primary-light">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium text-gray-700">Enviar entrega</p>
                        <button onClick={() => { setUploadingTaskId(null); setSelectedFiles([]); }} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <label className="block cursor-pointer">
                        <div className="flex flex-col items-center gap-2 py-4">
                          <Upload className="w-8 h-8 text-gray-400" />
                          <p className="text-sm text-gray-500">Clique para selecionar arquivos</p>
                          <p className="text-xs text-gray-400">PDF, imagens ou vídeos (máx. 100MB)</p>
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
                            <p key={i} className="text-sm text-gray-600 flex items-center gap-1">
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

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              Concluídas ({completed.length})
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {completed.map((task) => (
                <div key={task.id} className="flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{task.title}</p>
                    <p className="text-xs text-gray-400">
                      Etapa {task.stage} — Entregue em {task.files[0]?.uploadedAt ?? task.dueDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {task.files.length > 0 && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
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
