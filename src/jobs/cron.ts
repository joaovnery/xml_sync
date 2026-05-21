import cron from "node-cron";
import { XmlService } from "../services/xmlService";
import { getDynamicsDates, getDateNow } from "../utils/date.utils";
import { MailService } from "../services/mailSerivce";
import { StorageService } from "../services/storageService";
import { ChatService } from "../services/chatService";
import { StateManager } from "../utils/stateManager";

export const startCronJobs = () => {
  const cronSchedule = process.env.CRON_SCHEDULE || `* * * * *`;
  console.log(`[Sistema] Robô de Sincronização Iniciado! Cron ${cronSchedule}`);

  const xmlService = new XmlService();
  const mailService = new MailService();
  const storageService = new StorageService();
  const chatService = new ChatService();
  const getClient = process.env.CLIENT_NAME || "";

  let isRunning = false;

  cron.schedule(cronSchedule, async () => {
    if (isRunning) {
      console.log(
        `[Cron] [Aviso] A execução anterior ainda não terminou. Pulando está rodada para evitar duplicados`,
      );
    }

    const dateNow = getDateNow();
    const lookbackDays = parseInt(process.env.LOOKBACKDAYS || "1");
    const { iniDate, endDate } = getDynamicsDates(lookbackDays);

    try {
      isRunning = true;

      console.log(`\n[Cron] Acordando para executar tarefa...`);
      console.log(`[Cron] Cliente: ${getClient}`);

      const useFixDate = process.env.USE_FIX_DATE === "true";
      const finalIniDate = useFixDate
        ? (process.env.INI_DATE as string)
        : iniDate;

      const finalEndDate = useFixDate
        ? (process.env.END_DATE as string)
        : endDate;

      if (useFixDate) {
        console.log(
          `[Cron] Atenção: Usando datas Fixas do .env (${finalIniDate} a ${finalEndDate})\n`,
        );
      } else {
        console.log(
          `[Cron] Usando período dinâmico de ${lookbackDays} dia(s) ${finalIniDate} a ${finalEndDate}\n`,
        );
      }

      let { map, newlyFetchedKeys } = await xmlService.fetchXMLs(
        finalIniDate,
        finalEndDate,
      );

      if (!map || map.size === 0) {
        console.log(
          `\n[Cron] Nenhum XML para processar na data informada. Voltando a dormir...`,
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

      console.log(`\n[Cron] Tarefa concluída com sucesso!`);
    } catch (error) {
      console.error(`[Cron] Falha critica na execução da tarefa: ${error}`);
    } finally {
      isRunning = false;
    }
  });
};
