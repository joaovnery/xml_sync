import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().optional(),
  EMAIL_APP_PASSWORD: z.string().min(1, "EMAIL_APP_PASSWORD é obrigatória"),
  EMAIL_USER: z.string().min(1, "EMAIL_USER é obrigatória"),
  EMAIL_SENDER: z.string().min(1, "EMAIL_SENDER é obrigatória"),
  EMAIL_RECIPIENT: z.string().min(1, "EMAIL_RECIPIENT é obrigatória"),
  EMAIL_CC: z.string().optional(),
  GOOGLE_CHAT_WEBHOOK_URL: z.string().optional(),
  CRON_SCHEDULE: z.string().optional(),
  USE_FIX_DATE: z.string().optional(),
  INI_DATE: z.string().optional(),
  END_DATE: z.string().optional(),
  LOOKBACKDAYS: z.string().optional(),
  CLIENT_NAME: z.string().min(1, "CLIENT_NAME é obrigatória"),
  DB_HOST: z.string().min(1, "DB_HOST é obrigatória"),
  DB_PORT: z.string().min(1, "DB_PORT é obrigatória"),
  DB_USER: z.string().min(1, "DB_USER é obrigatória"),
  DB_PASSWORD: z.string().min(1, "DB_PASSWORD é obrigatória"),
  DB_NAME: z.string().min(1, "DB_NAME é obrigatória"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Erro de validação nas variáveis de ambiente:");
  console.error(JSON.stringify(_env.error.format(), null, 2));
  process.exit(1);
}

export const envConfig = _env.data;
