import "dotenv/config";
import express from "express";
import { startCronJobs } from "./jobs/cron";
import { Logger } from "./utils/logger";
import { envConfig } from "./config/env";

const app = express();
const PORT = envConfig.PORT;

app.listen(PORT, () => {
  Logger.success("Servidor", `Servidor iniciado com sucesso na porta ${PORT}`);
  startCronJobs();
});
