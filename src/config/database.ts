import mysql from "mysql2/promise";
import { envConfig } from "./env";

export const dbConnection = mysql.createPool({
  host: envConfig.DB_HOST || "127.0.0.1",
  user: envConfig.DB_USER,
  password: envConfig.DB_PASSWORD,
  database: envConfig.DB_NAME,
  port: Number(envConfig.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

process.on("SIGTERM", async () => {
  await dbConnection.end();
  process.exit(0);
});
