"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const xmlService_1 = require("../services/xmlService");
const date_utils_1 = require("../utils/date.utils");
const mailSerivce_1 = require("../services/mailSerivce");
const storageService_1 = require("../services/storageService");
const chatService_1 = require("../services/chatService");
const stateManager_1 = require("../utils/stateManager");
const startCronJobs = () => {
    const cronSchedule = process.env.CRON_SCHEDULE || `* * * * *`;
    console.log(`[Sistema] Robô de Sincronização Iniciado! Cron ${cronSchedule}`);
    const xmlService = new xmlService_1.XmlService();
    const mailService = new mailSerivce_1.MailService();
    const storageService = new storageService_1.StorageService();
    const chatService = new chatService_1.ChatService();
    const getClient = process.env.CLIENT_NAME || "";
    let isRunning = false;
    node_cron_1.default.schedule(cronSchedule, async () => {
        if (isRunning) {
            console.log(`[Cron] [Aviso] A execução anterior ainda não terminou. Pulando está rodada para evitar duplicados`);
        }
        const dateNow = (0, date_utils_1.getDateNow)();
        const lookbackDays = parseInt(process.env.LOOKBACKDAYS || "1");
        const { iniDate, endDate } = (0, date_utils_1.getDynamicsDates)(lookbackDays);
        try {
            isRunning = true;
            console.log(`\n[Cron] Acordando para executar tarefa...`);
            console.log(`[Cron] Cliente: ${getClient}`);
            const useFixDate = process.env.USE_FIX_DATE === "true";
            const finalIniDate = useFixDate
                ? process.env.INI_DATE
                : iniDate;
            const finalEndDate = useFixDate
                ? process.env.END_DATE
                : endDate;
            if (useFixDate) {
                console.log(`[Cron] Atenção: Usando datas Fixas do .env (${finalIniDate} a ${finalEndDate})\n`);
            }
            else {
                console.log(`[Cron] Usando período dinâmico de ${lookbackDays} dia(s) ${finalIniDate} a ${finalEndDate}\n`);
            }
            let { map, newlyFetchedKeys } = await xmlService.fetchXMLs(finalIniDate, finalEndDate);
            if (!map || map.size === 0) {
                console.log(`\n[Cron] Nenhum XML para processar na data informada. Voltando a dormir...`);
                await chatService.sendMessage(map.size, finalIniDate, finalEndDate);
                return;
            }
            const zipPath = await storageService.compressAndSave(map, `notas_${getClient}_${dateNow}.zip`);
            await mailService.sendZipsReport(zipPath, finalIniDate, finalEndDate);
            await chatService.sendMessage(map.size, finalIniDate, finalEndDate);
            if (newlyFetchedKeys.length > 0) {
                await stateManager_1.StateManager.addProcessedKeys(newlyFetchedKeys);
            }
            console.log(`\n[Cron] Tarefa concluída com sucesso!`);
        }
        catch (error) {
            console.error(`[Cron] Falha critica na execução da tarefa: ${error}`);
        }
        finally {
            isRunning = false;
        }
    });
};
exports.startCronJobs = startCronJobs;
