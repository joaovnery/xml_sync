import cron from "node-cron";
import { XmlServicePilecco, XmlServiceMebuki } from "../services/xmlService";
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

  const xmlServicePilecco = new XmlServicePilecco();
  const xmlServiceMebuki = new XmlServiceMebuki();
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
        const { map, filaIds } = await xmlServicePilecco.fetchXmls();

        if (!map || map.size === 0) {
          Logger.info(
            "Cron",
            "Nenhum XML pendente encontrado — aguardando próximo ciclo",
          );

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

        const difalData = await xmlServicePilecco.fetchDifalData(filaIds);

        await mailService.sendZipReportPilecco(zipPath as string, difalData);

        await xmlServicePilecco.markAsSent(filaIds);

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

        let { mapSerie3, mapSerie4, mapSerie5, newlyFetchedKeys } =
          await xmlServiceMebuki.fetchXmlsAvanco(finalIniDate, finalEndDate);

        const totalSize = mapSerie3.size + mapSerie4.size + mapSerie5.size;

        if (totalSize === 0) {
          Logger.info(
            "Cron",
            "Nenhum XML novo encontrado para o período — aguardando próximo ciclo",
          );
          await chatService.sendMessage(totalSize, finalIniDate, finalEndDate);
          return;
        }

        const zipPaths: string[] = [];

        if (mapSerie3.size > 0) {
          const zipPath3 = await storageService.compressAndSave(
            mapSerie3,
            `notas_Serie3_${getClient}_${dateNow}.zip`,
          );
          zipPaths.push(zipPath3 as string);
        }

        if (mapSerie4.size > 0) {
          const zipPath4 = await storageService.compressAndSave(
            mapSerie4,
            `notas_Serie4_${getClient}_${dateNow}.zip`,
          );
          zipPaths.push(zipPath4 as string);
        }

        if (mapSerie5.size > 0) {
          const zipPath5 = await storageService.compressAndSave(
            mapSerie5,
            `notas_Serie5_${getClient}_${dateNow}.zip`,
          );
          zipPaths.push(zipPath5 as string);
        }

        if (zipPaths.length > 0) {
          await mailService.sendZipsReport(
            zipPaths,
            finalIniDate,
            finalEndDate,
          );
        }

        await chatService.sendMessage(totalSize, finalIniDate, finalEndDate);

        if (newlyFetchedKeys.length > 0) {
          await StateManager.addProcessedKeys(newlyFetchedKeys);
        }

        Logger.success(
          "Cron",
          `Tarefa concluída — ${totalSize} nota(s) processada(s) e enviada(s) divididas por série.`,
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
