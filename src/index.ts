import "dotenv/config";
import express from "express";
import { startCronJobs } from "./jobs/cron";

const app = express();
const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`[Sistema] Servidor executando na Porta: ${PORT}`);
  startCronJobs();
});
