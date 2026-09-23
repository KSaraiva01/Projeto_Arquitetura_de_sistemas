import "dotenv/config";
import { prisma } from "../lib/prisma";
import { gerarBackup } from "./backup";

/**
 * `npm run backup` — gera um backup agora (RNF-07), sem esperar a rotina
 * agendada. No Coolify: Terminal do container → `npm run backup`.
 */
gerarBackup()
  .then(async (r) => {
    console.log(
      `[backup] ${r.arquivo}\n[backup] ${r.tabelas} tabelas, ${r.linhas} registros, ${r.arquivosCopiados} arquivo(s) de entrega copiados` +
        (r.removidos ? `, ${r.removidos} backup(s) antigo(s) removido(s)` : ""),
    );
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("[backup] falhou:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
