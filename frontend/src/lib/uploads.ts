/**
 * Limites da entrega (RNF-04), os mesmos padrões do backend
 * (UPLOAD_MAX_MB, UPLOAD_MAX_FILES e a lista de `shared/armazenamento.ts`).
 * Conferir antes de enviar poupa o upload de um arquivo que seria recusado;
 * se o servidor estiver configurado diferente, a mensagem dele aparece.
 */
export const UPLOAD_MAX_FILES = 5;
export const UPLOAD_MAX_MB = 50;

export const UPLOAD_EXTENSIONS = [
  ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".mp4", ".webm", ".mov",
  ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".odt", ".odp", ".ods",
  ".zip", ".txt", ".csv",
];

export const UPLOAD_HINT = `PDF, imagem, vídeo, Office/LibreOffice, ZIP ou texto — até ${UPLOAD_MAX_MB} MB por arquivo, ${UPLOAD_MAX_FILES} por envio`;

/** Problema do conjunto de arquivos escolhido, ou null se está tudo certo. */
export function uploadProblem(files: File[]): string | null {
  if (files.length > UPLOAD_MAX_FILES) return `Envie no máximo ${UPLOAD_MAX_FILES} arquivos por vez.`;
  for (const file of files) {
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!file.name.includes(".") || !UPLOAD_EXTENSIONS.includes(extension)) {
      return `Tipo de arquivo não permitido: ${file.name}.`;
    }
    if (file.size > UPLOAD_MAX_MB * 1024 * 1024) {
      return `${file.name} passa de ${UPLOAD_MAX_MB} MB. Para vídeos grandes, envie um link (YouTube/Drive).`;
    }
  }
  return null;
}
