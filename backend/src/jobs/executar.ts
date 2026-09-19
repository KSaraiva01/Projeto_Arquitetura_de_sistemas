import "dotenv/config";
import { prisma } from "../lib/prisma";
import { executarJobs } from "./scheduler";

/**
 * Executa a rotina agendada uma única vez e encerra (`npm run jobs:run`).
 * Útil para testar o RN-04 e a fila de e-mails sem esperar o intervalo.
 */
executarJobs()
  .then(async (relatorio) => {
    console.log("[jobs] concluído:", relatorio);
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("[jobs] falhou:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
