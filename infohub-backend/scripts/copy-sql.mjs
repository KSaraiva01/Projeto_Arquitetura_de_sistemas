// O tsc compila apenas .ts; as migrations SQL precisam ser copiadas
// para dist/ à mão, senão o runner não as encontra no build de produção.
import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const from = join(root, "src", "database", "migrations");
const to = join(root, "dist", "database", "migrations");

await mkdir(to, { recursive: true });
await cp(from, to, { recursive: true });

console.log(`[build] migrations copiadas para ${to}`);
