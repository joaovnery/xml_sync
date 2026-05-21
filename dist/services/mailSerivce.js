"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const date_utils_1 = require("../utils/date.utils");
class MailService {
    transporter;
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD,
            },
        });
    }
    async sendZipsReport(file, iniDate, endDate) {
        console.log("\n[Mail Service] Preparando e-mail com os arquivos ZIP em anexo...");
        console.log(`[Mail Service] [Remetente: ${process.env.EMAIL_SENDER}] - [Destinatário: ${process.env.EMAIL_RECIPIENT}] - [CC: ${process.env.EMAIL_CC}]`);
        const formatIniDate = (0, date_utils_1.formatDateForUTCBrazil)(iniDate);
        const formatEndDate = (0, date_utils_1.formatDateForUTCBrazil)(endDate);
        try {
            await this.transporter.sendMail({
                from: `${process.env.EMAIL_SENDER}`,
                cc: `${process.env.EMAIL_CC}`,
                to: `${process.env.EMAIL_RECIPIENT}`,
                subject: `NF-e emitidas no Período ${formatIniDate} a ${formatEndDate} - [${process.env.CLIENT_NAME}]`,
                text: `Pessoal, bom dia! \nEspero que estejam bem! Segue em anexo as notas fiscais emitidas durante o período de ${formatIniDate} a ${formatEndDate}`,
                attachments: [
                    { filename: `notas_${process.env.CLIENT_NAME}.zip`, path: file },
                ],
            });
            console.log("[Mail Service] E-mail enviado com sucesso para os destinatários!");
        }
        catch (error) {
            console.error(`Erro ao enviar e-mail ${error}`);
        }
    }
}
exports.MailService = MailService;
