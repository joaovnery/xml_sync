"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const date_utils_1 = require("../utils/date.utils");
class ChatService {
    webhookUrl;
    constructor() {
        this.webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL || "";
    }
    async sendMessage(quantityXmls, iniDate, endDate) {
        const formatIniDate = (0, date_utils_1.formatDateForUTCBrazil)(iniDate);
        const formatEndDate = (0, date_utils_1.formatDateForUTCBrazil)(endDate);
        try {
            console.log("\n[Chat Service] Enviando notificação para o Google Chat...");
            let message;
            message = `Cliente: ${process.env.CLIENT_NAME} \n Notas sincronizadas e enviadas com sucesso - data do periodo ${formatIniDate} a ${formatEndDate} - \n Quantidade de XMLs coletados: ${quantityXmls}. - E-mail Enviado com sucesso!`;
            if (quantityXmls === 0) {
                message = `Cliente: ${process.env.CLIENT_NAME} \n Não foram encontradas Notas para o período informado: ${formatIniDate} a ${formatEndDate}, com isso não enviaremos o E-mail.`;
            }
            await fetch(this.webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: message }),
            });
            console.log("[Chat Service] Notificação Enviada com sucesso!\n");
        }
        catch (error) {
            const message = `Cliente: ${process.env.CLIENT_NAME} \n Alerta - Falha na sincronização de XMLs - Robo falhou.* ${error}`;
            await fetch(this.webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: message }),
            });
        }
    }
}
exports.ChatService = ChatService;
