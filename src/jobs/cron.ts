import cron from "node-cron";
import { XmlService } from "../services/xmlService";
import { getDynamicsDates, getDateNow } from "../utils/date.utils";
import { MailService } from "../services/mailSerivce";
import { StorageService } from "../services/storageService";
import { ChatService } from "../services/chatService";
import { StateManager } from "../utils/stateManager";
import { Logger } from "../utils/logger";
import { envConfig } from "../config/env";

export const startCronJobs = () => {
  const cronSchedule = envConfig.CRON_SCHEDULE || `* * * * *`;
  Logger.info(
    "Cron",
    `Robô de sincronização iniciado — Agenda: ${cronSchedule}`,
  );

  const xmlService = new XmlService();
  const mailService = new MailService();
  const storageService = new StorageService();
  const chatService = new ChatService();
  const getClient = envConfig.CLIENT_NAME || "";

  let isRunning = false;

  cron.schedule(cronSchedule, async () => {
    if (isRunning) {
      Logger.warn(
        "Cron",
        "Execução anterior ainda em andamento — pulando esta rodada",
      );
      return;
    }

    // ------- Pilecco ------- //

    if (envConfig.CLIENT_NAME === "Pilecco") {
      Logger.separator();
      Logger.info("Cron", `Iniciando execução — Cliente: ${getClient}`);
      try {
        isRunning = true;
        const dateNow = getDateNow();
        const { map, filaIds } = await xmlService.fetchXmlsPilecco();

        if (!map || map.size === 0) {
          Logger.info(
            "Cron",
            "Nenhum XML pendente encontrado — aguardando próximo ciclo",
          );

          // await chatService.sendMessage(map.size);
          return;
        }

        Logger.info(
          "Cron",
          `${map.size} nota(s) pendente(s) encontrada(s) — gerando ZIP`,
        );
        const zipPath = await storageService.compressAndSave(
          map,
          `notas_${getClient}_${dateNow}.zip`,
        );

        const difalData = await xmlService.fetchDifalData(filaIds);

        await mailService.sendZipReportPilecco(zipPath as string, difalData);

        await xmlService.markAsSent(filaIds);

        await chatService.sendMessagePilecco(map.size);
      } catch (error) {
        Logger.error(
          "Cron",
          `Falha na execução — Cliente: ${getClient}`,
          error,
        );
      } finally {
        isRunning = false;
      }
    }

    // --------- Mebuki --------------- //

    if (envConfig.CLIENT_NAME === "Mebuki") {
      const dateNow = getDateNow();
      const lookbackDays = parseInt(envConfig.LOOKBACKDAYS || "1");
      const { iniDate, endDate } = getDynamicsDates(lookbackDays);

      try {
        Logger.separator();
        Logger.info("Cron", `Iniciando execução — Cliente: ${getClient}`);

        isRunning = true;

        const useFixDate = envConfig.USE_FIX_DATE === "true";
        const finalIniDate = useFixDate
          ? (envConfig.INI_DATE as string)
          : iniDate;

        const finalEndDate = useFixDate
          ? (envConfig.END_DATE as string)
          : endDate;

        if (useFixDate) {
          Logger.warn(
            "Cron",
            `Usando datas FIXAS do .env: ${finalIniDate} → ${finalEndDate}`,
          );
        } else {
          Logger.info(
            "Cron",
            `Período dinâmico: ${lookbackDays} dia(s) — ${finalIniDate} → ${finalEndDate}`,
          );
        }

        let { map, newlyFetchedKeys } = await xmlService.fetchXmlsMebuki(
          finalIniDate,
          finalEndDate,
        );

        if (!map || map.size === 0) {
          Logger.info(
            "Cron",
            "Nenhum XML novo encontrado para o período — aguardando próximo ciclo",
          );
          await chatService.sendMessage(map.size, finalIniDate, finalEndDate);
          return;
        }

        const zipPath = await storageService.compressAndSave(
          map,
          `notas_${getClient}_${dateNow}.zip`,
        );

        await mailService.sendZipsReport(
          zipPath as string,
          finalIniDate,
          finalEndDate,
        );
        await chatService.sendMessage(map.size, finalIniDate, finalEndDate);

        if (newlyFetchedKeys.length > 0) {
          await StateManager.addProcessedKeys(newlyFetchedKeys);
        }

        Logger.success(
          "Cron",
          `Tarefa concluída — ${map.size} nota(s) processada(s) e enviada(s)`,
        );
      } catch (error) {
        Logger.error(
          "Cron",
          `Falha na execução — Cliente: ${getClient}`,
          error,
        );
      } finally {
        isRunning = false;
      }
    }
  });
};
