import React, { useRef, useState } from 'react'
import { UploadCloud, FileText, CheckCircle2, Loader2 } from 'lucide-react'

interface FileUploadProps {
  onFileSelected: (file: { name: string; sizeKb: number }) => void
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<{ name: string; sizeKb: number } | null>(null)

  const simulateUpload = (file: File) => {
    setUploading(true)
    setSelected(null)
    // Simula latência de envio, sem enviar de fato para nenhum servidor
    setTimeout(() => {
      const info = { name: file.name, sizeKb: Math.max(12, Math.round(file.size / 1024)) }
      setSelected(info)
      setUploading(false)
      onFileSelected(info)
    }, 900)
  }

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) simulateUpload(files[0])
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragOver ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/15' : 'border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-ink-950 hover:border-brand-300 dark:hover:border-brand-500/40 hover:bg-brand-50 dark:hover:bg-brand-500/15'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <>
            <Loader2 size={28} className="animate-spin text-brand-500" />
            <p className="mt-3 text-sm font-medium text-ink-800 dark:text-white/90">Enviando arquivo (simulado)...</p>
          </>
        ) : selected ? (
          <>
            <CheckCircle2 size={28} className="text-trail-done" />
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-ink-900 dark:text-white">
              <FileText size={15} /> {selected.name}
            </p>
            <p className="mt-0.5 text-xs text-ink-700/50 dark:text-white/40">{selected.sizeKb} KB — clique para trocar o arquivo</p>
          </>
        ) : (
          <>
            <UploadCloud size={28} className="text-ink-700/40 dark:text-white/35" />
            <p className="mt-3 text-sm font-medium text-ink-800 dark:text-white/90">Arraste um arquivo ou clique para selecionar</p>
            <p className="mt-0.5 text-xs text-ink-700/40 dark:text-white/35">PDF, DOCX, PPTX, PNG ou JPG — envio simulado, nada é enviado a um servidor</p>
          </>
        )}
      </div>
    </div>
  )
}
