import { Router } from "express";
import { pool } from "./config/database.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { tasksRouter } from "./modules/tasks/tasks.routes.js";
import { teamsRouter } from "./modules/teams/teams.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

export const router = Router();

/** Health check: usado por deploy, monitoramento e pelo próprio frontend. */
router.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", database: "up", timestamp: new Date() });
  } catch {
    res
      .status(503)
      .json({ status: "degraded", database: "down", timestamp: new Date() });
  }
});

router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/teams", teamsRouter);
router.use("/tasks", tasksRouter);
