import { formatDateForUTCBrazil } from "../utils/date.utils";
import { Logger } from "../utils/logger";
import { envConfig } from "../config/env";

export class ChatService {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = envConfig.GOOGLE_CHAT_WEBHOOK_URL || "";
  }

  async sendMessage(quantityXmls: number, iniDate: string, endDate: string) {
    const formatIniDate = formatDateForUTCBrazil(iniDate);

    try {
      Logger.info("Google Chat", "Enviando notificação para o Google Chat");

      let message: string;

      if (quantityXmls === 0) {
        message = [
          `ℹ️ *Nenhuma Nota Encontrada*`,
          ``,
          `📌 *Cliente:* ${envConfig.CLIENT_NAME}`,
          `📅 *Período:* ${formatIniDate}`,
          `📦 *XMLs coletados:* 0`,
          `📧 *E-mail:* Não enviado (sem notas no período)`,
        ].join("\n");
      } else {
        message = [
          `✅ *Sincronização Concluída*`,
          ``,
          `📌 *Cliente:* ${envConfig.CLIENT_NAME}`,
          `📅 *Período:* ${formatIniDate}`,
          `📦 *XMLs coletados:* ${quantityXmls}`,
          `📧 *E-mail:* Enviado com sucesso`,
        ].join("\n");
      }

      await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });

      Logger.success("Google Chat", "Notificação enviada com sucesso");
    } catch (error) {
      try {
        const errorMessage = [
          `🚨 *FALHA NA SINCRONIZAÇÃO*`,
          ``,
          `📌 *Cliente:* ${envConfig.CLIENT_NAME}`,
          `❌ *Erro:* ${error instanceof Error ? error.message : String(error)}`,
          ``,
          `⚠️ Verifique os logs do servidor para mais detalhes.`,
        ].join("\n");

        await fetch(this.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: errorMessage }),
        });
      } catch (innerError) {
        Logger.error(
          "Google Chat",
          "Falha crítica — impossível comunicar com o Google Chat",
          innerError,
        );
      }

      throw error;
    }
  }

  async sendMessagePilecco(quantityXmls: number) {
    try {
      Logger.info("Google Chat", "Enviando notificação para o Google Chat");

      let message: string;

      if (quantityXmls === 0) {
        message = [
          `ℹ️ *Nenhuma Nota Pendente*`,
          ``,
          `📌 *Cliente:* ${envConfig.CLIENT_NAME}`,
          `📦 *XMLs encontrados:* 0`,
          `📧 *E-mail:* Não enviado (sem notas pendentes)`,
        ].join("\n");
      } else {
        message = [
          `✅ *Sincronização Concluída*`,
          ``,
          `📌 *Cliente:* ${envConfig.CLIENT_NAME}`,
          `📦 *XMLs enviados:* ${quantityXmls}`,
          `📧 *E-mail:* Enviado com sucesso`,
        ].join("\n");
      }

      await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });

      Logger.success("Google Chat", "Notificação enviada com sucesso");
    } catch (error) {
      try {
        const errorMessage = [
          `🚨 *FALHA NA SINCRONIZAÇÃO*`,
          ``,
          `📌 *Cliente:* ${envConfig.CLIENT_NAME}`,
          `❌ *Erro:* ${error instanceof Error ? error.message : String(error)}`,
          ``,
          `⚠️ Verifique os logs do servidor para mais detalhes.`,
        ].join("\n");

        await fetch(this.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: errorMessage }),
        });
      } catch (innerError) {
        Logger.error(
          "Google Chat",
          "Falha crítica — impossível comunicar com o Google Chat",
          innerError,
        );

        throw error;
      }
    }
  }
}
