import { Router } from "express";
import { executarJobs } from "./jobs/scheduler";
import { prisma } from "./lib/prisma";
import { authRouter } from "./modules/auth/auth.routes";
import { areasRouter, coursesRouter, stagesRouter } from "./modules/catalogos/catalogos.routes";
import { teamsRouter } from "./modules/equipes/equipes.routes";
import { reportsRouter } from "./modules/relatorios/relatorios.routes";
import { tasksRouter } from "./modules/tarefas/tarefas.routes";
import { usersRouter } from "./modules/usuarios/usuarios.routes";
import { autenticar, autorizar } from "./shared/middlewares/autenticar";

/** Todas as rotas da API, montadas em /api (ver app.ts). */
export const apiRouter = Router();

/** Health check: usado pelo Coolify e por monitoramento. */
apiRouter.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    res.status(200).json({ status: "ok", database: "up", timestamp: new Date() });
  } catch {
    res.status(503).json({ status: "degraded", database: "down", timestamp: new Date() });
  }
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/teams", teamsRouter);
apiRouter.use("/tasks", tasksRouter);
apiRouter.use("/areas", areasRouter);
apiRouter.use("/courses", coursesRouter);
apiRouter.use("/stages", stagesRouter);
apiRouter.use("/reports", reportsRouter);

/** Dispara a rotina agendada na hora (RN-04, lembretes, fila de e-mails). */
apiRouter.post("/jobs/run", autenticar, autorizar("ADMIN"), async (_req, res) => {
  res.status(200).json(await executarJobs());
});
