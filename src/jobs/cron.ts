import cron from "node-cron";
import { XmlService } from "../services/xmlService";
import { getDynamicsDates, getDateNow } from "../utils/date.utils";
import { MailService } from "../services/mailSerivce";
import { StorageService } from "../services/storageService";
import { ChatService } from "../services/chatService";

export const startCronJobs = () => {
  const cronSchedule = process.env.CRON_SCHEDULE || `* * * * *`;
  console.log(`[Sistema] Robô de Sincronização Iniciado! Cron ${cronSchedule}`);

  const xmlService = new XmlService();
  const mailService = new MailService();
  const storageService = new StorageService();
  const chatService = new ChatService();

  cron.schedule(cronSchedule, async () => {
    console.log(`\n[Cron] Acordando para executar tarefa...`);

    try {
      const dateNow = getDateNow();
      const lookbackDays = parseInt(process.env.LOOKBACKDAYS || "7", 10);
      const { iniDate, endDate } = getDynamicsDates(lookbackDays);

      let map;

      if (process.env.USE_FIX_DATE === "true") {
        console.log(
          `[Cron] Atenção: Usando datas Fixas do .env (${process.env.INI_DATE} a ${process.env.END_DATE})\n`,
        );

        map = await xmlService.fetchXMLsPerWeekend(
          process.env.INI_DATE as string,
          process.env.END_DATE as string,
        );

        if (!map || map.size === 0) {
          console.log(
            `[Cron] Nenhum XML para processar na data informada. Voltando a dormir...`,
          );

          await chatService.sendMessageXmlsZero();
          return;
        }

        const path = await storageService.compressAndSave(
          map,
          `notas_pilecco_${dateNow}.zip`,
        );

        await mailService.sendZipsReport(
          path as string,
          process.env.INI_DATE as string,
          process.env.END_DATE as string,
        );

        await chatService.sendMessage(
          map.size,
          process.env.INI_DATE as string,
          process.env.END_DATE as string,
        );
      } else {
        console.log(
          `[Cron] Usando período dinâmico de ${lookbackDays} dias ${iniDate} a ${endDate} \n`,
        );

        map = await xmlService.fetchXMLsPerWeekend(iniDate, endDate);

        if (!map || map.size === 0) {
          console.log(
            `[Cron] Nenhum XML para processar na data informada. Voltando a dormir...`,
          );

          await chatService.sendMessageXmlsZero();
          return;
        }

        const path = await storageService.compressAndSave(
          map,
          `notas_pilecco_${dateNow}.zip`,
        );

        await mailService.sendZipsReport(path as string, iniDate, endDate);
        await chatService.sendMessage(map.size, iniDate, endDate);
      }

      console.log(`\n[Cron] Tarefa concluída com sucesso!`);
    } catch (error) {
      console.error(`[Cron] Falha critica na execução da tarefa: ${error}`);
    }
  });
};
