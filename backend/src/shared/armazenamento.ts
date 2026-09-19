import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { env } from "../config/env";
import { BadRequestError } from "./errors";

/**
 * Armazenamento dos arquivos das entregas (RF-14, RNF-04).
 *
 * Os binários ficam em disco, em `UPLOADS_DIR` (no Coolify, um volume
 * persistente montado em /app/uploads). No banco vai só o metadado
 * (`anexos_entrega.caminho_armazenamento`, relativo a essa pasta).
 * Nada aqui é servido como estático: o download passa pela API, que confere
 * o escopo do usuário antes de entregar o arquivo.
 */

/** Tipos aceitos como entregável: documentos, imagens, vídeo (pitch) e pacotes. */
const MIME_PERMITIDOS = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.presentation",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/zip",
  "application/x-zip-compressed",
  "text/plain",
  "text/csv",
]);

const EXTENSOES_PERMITIDAS = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".mp4", ".webm", ".mov",
  ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".odt", ".odp", ".ods",
  ".zip", ".txt", ".csv",
]);

function pastaDoMes(): string {
  const agora = new Date();
  return path.join(String(agora.getFullYear()), String(agora.getMonth() + 1).padStart(2, "0"));
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    const destino = path.join(env.uploadsDir, pastaDoMes());
    fs.mkdirSync(destino, { recursive: true });
    cb(null, destino);
  },
  filename(_req, file, cb) {
    // Nome aleatório no disco: evita colisões e path traversal pelo nome original.
    const extensao = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${extensao}`);
  },
});

export const uploadEntrega = multer({
  storage,
  limits: { fileSize: env.uploadMaxBytes, files: env.UPLOAD_MAX_FILES },
  fileFilter(_req, file, cb) {
    const extensao = path.extname(file.originalname).toLowerCase();
    if (!MIME_PERMITIDOS.has(file.mimetype) || !EXTENSOES_PERMITIDAS.has(extensao)) {
      cb(
        new BadRequestError(
          `Tipo de arquivo não permitido (${file.originalname}). Envie PDF, imagem, vídeo, documento Office/LibreOffice ou ZIP.`,
          "UPLOAD_TYPE_NOT_ALLOWED",
        ),
      );
      return;
    }
    cb(null, true);
  },
});

/** Caminho relativo (o que vai para o banco) a partir do caminho absoluto do multer. */
export function caminhoRelativo(absoluto: string): string {
  return path.relative(env.uploadsDir, absoluto).split(path.sep).join("/");
}

/** Caminho absoluto de um anexo gravado, validando que continua dentro de UPLOADS_DIR. */
export function caminhoAbsoluto(relativo: string): string {
  const absoluto = path.resolve(env.uploadsDir, relativo);
  if (!absoluto.startsWith(env.uploadsDir + path.sep) && absoluto !== env.uploadsDir) {
    throw new BadRequestError("Caminho de arquivo inválido.", "INVALID_FILE_PATH");
  }
  return absoluto;
}

/** Remove arquivos já gravados quando a transação da entrega falha. */
export async function descartarArquivos(arquivos: Express.Multer.File[] | undefined) {
  for (const arquivo of arquivos ?? []) {
    await fs.promises.unlink(arquivo.path).catch(() => undefined);
  }
}
