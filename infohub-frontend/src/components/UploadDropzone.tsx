"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";

interface UploadDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/**
 * Área de envio de entregável: aceita arrastar e soltar além do clique,
 * lista o que foi escolhido com tamanho e deixa tirar um arquivo antes
 * de enviar. A borda reage ao arrastar por cima para a pessoa saber que
 * pode soltar.
 */
export default function UploadDropzone({
  files,
  onFilesChange,
  onSubmit,
  onCancel,
  submitting = false,
}: UploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    onFilesChange([...files, ...Array.from(list)]);
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        addFiles(event.dataTransfer.files);
      }}
      className={`animate-rise rounded-lg border-2 border-dashed p-4 transition-[border-color,background-color] duration-150 ${
        dragOver
          ? "animate-drop-pulse border-primary bg-primary/10"
          : "border-primary/30 bg-highlight-bg"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Enviar entrega</p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Fechar envio"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-light transition-colors hover:bg-hover-bg hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center gap-2 rounded-lg py-4 transition-colors hover:bg-primary/5"
      >
        <Upload
          className={`h-8 w-8 transition-transform duration-150 ${
            dragOver ? "-translate-y-1 text-primary" : "text-muted-light"
          }`}
        />
        <p className="text-sm text-muted">
          {dragOver ? "Solte para adicionar" : "Arraste arquivos aqui ou clique para selecionar"}
        </p>
        <p className="text-xs text-muted-light">PDF, imagens ou vídeos (máx. 100MB)</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {files.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              style={{ animationDelay: `${index * 40}ms` }}
              className="animate-row-in flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-blue-500" />
              <span className="min-w-0 flex-1 truncate text-foreground">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-light">{formatSize(file.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label={`Remover ${file.name}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-light transition-colors hover:bg-hover-bg hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Enviando…" : `Enviar ${files.length} ${files.length === 1 ? "arquivo" : "arquivos"}`}
          </button>
        </div>
      )}
    </div>
  );
}
