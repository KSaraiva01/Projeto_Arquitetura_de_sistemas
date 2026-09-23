/** Formatação em pt-BR usada nas telas. */

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatSize(bytes: number | null) {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Hoje em AAAA-MM-DD no fuso do navegador (mínimo dos campos de data). */
export function todayIso() {
  return new Date().toLocaleDateString("sv-SE");
}

/** AAAA-MM-DD de uma data ISO, no fuso do navegador (valor de um <input type="date">). */
export function isoDay(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE");
}
