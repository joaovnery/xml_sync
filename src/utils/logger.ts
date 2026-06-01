type LogLevel = "INFO" | "WARN" | "ERROR" | "SUCCESS";

const COLORS: Record<LogLevel, string> = {
  INFO: "\x1b[36m",
  WARN: "\x1b[33m",
  ERROR: "\x1b[31m",
  SUCCESS: "\x1b[32m",
};

const RESET = "\x1b[0m";

const getTimestamp = (): string => {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
};

const formatMessage = (
  level: LogLevel,
  context: string,
  message: string,
): string => {
  return `${COLORS[level]}[${getTimestamp()}] [${level}] [${context}]${RESET} ${message}`;
};

export const Logger = {
  info: (context: string, message: string) => {
    console.log(formatMessage("INFO", context, message));
  },
  warn: (context: string, message: string) => {
    console.warn(formatMessage("WARN", context, message));
  },
  error: (context: string, message: string, error?: unknown) => {
    console.error(formatMessage("ERROR", context, message));
    if (error) console.error(error);
  },
  success: (context: string, message: string) => {
    console.log(formatMessage("SUCCESS", context, message));
  },
  separator: () => {
    console.log(`\x1b[90m${"─".repeat(60)}\x1b[0m`);
  },
};
