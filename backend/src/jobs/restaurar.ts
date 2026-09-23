import "dotenv/config";
import path from "node:path";
import { env } from "../config/env";
import { prisma, schemaBanco } from "../lib/prisma";
import { lerBackup, listarBackups, migrationsAplicadas, restaurarBackup } from "./backup";

/**
 * `npm run backup:restaurar -- <arquivo | ultimo> --confirmar` (RNF-07).
 *
 * Sem argumentos, só lista os backups disponíveis. A restauração APAGA o
 * conteúdo atual do schema e o substitui pelo do backup — por isso exige
 * `--confirmar` — e só roda se o banco estiver com as mesmas migrations do
 * backup (aplique-as antes com `npm run db:deploy`).
 */
async function main() {
  const args = process.argv.slice(2);
  const confirmar = args.includes("--confirmar");
  const alvo = args.find((a) => !a.startsWith("--"));
  const disponiveis = listarBackups();

  if (!alvo) {
    console.log(`[restaurar] backups em ${env.backupDir}:`);
    for (const arquivo of disponiveis) console.log(`  ${path.basename(arquivo)}`);
    if (!disponiveis.length) console.log("  (nenhum)");
    console.log("\nUso: npm run backup:restaurar -- <arquivo | ultimo> --confirmar");
    return;
  }

  const arquivo = alvo === "ultimo" ? disponiveis[0] : path.resolve(env.backupDir, alvo);
  if (!arquivo) throw new Error(`Nenhum backup encontrado em ${env.backupDir}.`);

  const conteudo = lerBackup(arquivo);
  const noBanco = await migrationsAplicadas();
  if (conteudo.migrations.join(",") !== noBanco.join(",")) {
    throw new Error(
      "O banco não está com as mesmas migrations do backup.\n" +
        `  backup: ${conteudo.migrations.join(", ") || "(nenhuma)"}\n  banco:  ${noBanco.join(", ") || "(nenhuma)"}\n` +
        "Aplique as migrations do backup (npm run db:deploy na mesma versão do código) e tente de novo.",
    );
  }

  const registros = Object.values(conteudo.tabelas).reduce((soma, linhas) => soma + linhas.length, 0);
  console.log(
    `[restaurar] ${path.basename(arquivo)} — gerado em ${conteudo.geradoEm} a partir do schema "${conteudo.schema}", ` +
      `${registros} registros.\n[restaurar] destino: schema "${schemaBanco}" (todo o conteúdo atual será substituído).`,
  );
  if (!confirmar) {
    console.log("[restaurar] nada foi alterado. Repita com --confirmar para restaurar.");
    return;
  }

  const resultado = await restaurarBackup(conteudo);
  console.log(`[restaurar] concluído: ${resultado.linhas} registros gravados, ${resultado.arquivosCopiados} arquivo(s) de entrega recuperados.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("[restaurar] falhou:", error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
