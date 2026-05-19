import nodemailer from "nodemailer";
import { formatDateForUTCBrazil } from "../utils/date.utils";

export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });
  }

  public async sendZipsReport(file: string, iniDate: string, endDate: string) {
    console.log(
      "\n[Mail Service] Preparando e-mail com os arquivos ZIP em anexo...",
    );
    console.log(
      `[Mail Service] [Remetente: ${process.env.EMAIL_SENDER}] - [Destinatário: ${process.env.EMAIL_RECIPIENT}] - [CC: ${process.env.EMAIL_CC}]`,
    );

    const formatIniDate = formatDateForUTCBrazil(iniDate);
    const formatEndDate = formatDateForUTCBrazil(endDate);

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

      console.log(
        "[Mail Service] E-mail enviado com sucesso para os destinatários!",
      );
    } catch (error) {
      console.error(`Erro ao enviar e-mail ${error}`);
    }
  }
}
