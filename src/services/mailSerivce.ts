import nodemailer from "nodemailer";
import path from "path";
import { formatDateForUTCBrazil } from "../utils/date.utils";
import { Logger } from "../utils/logger";
import { envConfig } from "../config/env";
import { DifalRow } from "./xmlService";

export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: envConfig.EMAIL_USER,
        pass: envConfig.EMAIL_APP_PASSWORD,
      },
    });
  }

  async sendZipsReport(file: string, iniDate: string, endDate: string) {
    Logger.info(
      "E-mail",
      `Preparando envio — De: ${envConfig.EMAIL_SENDER} | Para: ${envConfig.EMAIL_RECIPIENT} | CC: ${envConfig.EMAIL_CC}`,
    );

    const formatIniDate = formatDateForUTCBrazil(iniDate);

    try {
      await this.transporter.sendMail({
        from: `${envConfig.EMAIL_SENDER}`,
        cc: `${envConfig.EMAIL_CC}`,
        to: `${envConfig.EMAIL_RECIPIENT}`,
        subject: `NF-e — Período ${formatIniDate} | ${envConfig.CLIENT_NAME}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8f9fa; border-radius: 8px;">
            <div style="background: linear-gradient(135deg, #1a73e8, #0d47a1); padding: 20px 24px; border-radius: 8px 8px 0 0; color: #ffffff;">
              <h2 style="margin: 0; font-size: 18px;">📄 Notas Fiscais Eletrônicas</h2>
              <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Envio automático — ${envConfig.CLIENT_NAME}</p>
            </div>
            <div style="background: #ffffff; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
              <p style="margin: 0 0 16px; color: #333;">Prezados,</p>
              <p style="margin: 0 0 16px; color: #333;">
                Segue em anexo o arquivo ZIP contendo as notas fiscais eletrônicas (NF-e)
                emitidas durante o período de <strong>${formatIniDate}</strong>.
              </p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr>
                  <td style="padding: 8px 12px; background: #e8f0fe; border-radius: 4px; color: #1a73e8; font-weight: 600;">
                    📅 Período: ${formatIniDate}
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0; font-size: 12px; color: #999;">
                Este é um e-mail automático enviado pelo sistema de sincronização de NF-e — Nérus.
              </p>
            </div>
          </div>
        `,
        attachments: [{ filename: path.basename(file), path: file }],
      });

      Logger.success(
        "E-mail",
        "E-mail enviado com sucesso para todos os destinatários",
      );
    } catch (error) {
      Logger.error("E-mail", "Falha ao enviar e-mail via SMTP", error);
      throw error;
    }
  }

  async sendZipReportPilecco(file: string, difalData: DifalRow[]) {
    Logger.info(
      "E-mail",
      `Preparando envio — De: ${envConfig.EMAIL_SENDER} | Para: ${envConfig.EMAIL_RECIPIENT} | CC: ${envConfig.EMAIL_CC}`,
    );

    let difalHtml = "";

    if (difalData && difalData.length > 0) {
      const cardsHtml = difalData
        .map((row) => {
          // Formata as alíquotas removendo zeros decimais extras (ex: de 12.0000 para 12)
          const alqInterna = row["Al_Interna%"]
            ? parseFloat(row["Al_Interna%"].toString())
            : 0;
          const alqDestino = row["Al_Destin%"]
            ? parseFloat(row["Al_Destin%"].toString())
            : 0;

          return `
        <div style="background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #333;">
            <strong>NF:</strong> ${row.NF} (Série ${row.Sr}) | <strong>Loja:</strong> ${row.Loja} | <strong>Destino (UF):</strong> ${row.UF}
          </p>
          
          <table style="width: 100%; font-size: 13px; color: #555; margin-bottom: 8px; border-collapse: collapse;">
            <tr>
              <td style="padding: 3px 0;"><strong>Emissão:</strong> ${row.Emissao || "---"}</td>
              <td style="padding: 3px 0;"><strong>Base ICMS:</strong> R$ ${row.BaseICMS_}</td>
              <td style="padding: 3px 0;"><strong>Valor ICMS:</strong> R$ ${row.ValorICMS}</td>
            </tr>
            <tr>
              <td style="padding: 3px 0;"><strong>Alíq. Interna:</strong> ${alqInterna}%</td>
              <td style="padding: 3px 0;"><strong>Alíq. Destino:</strong> ${alqDestino}%</td>
              <td style="padding: 3px 0;"><strong>Valor DIFAL:</strong> R$ ${row.ValorDIFAL}</td>
            </tr>
          </table>

          <p style="margin: 8px 0 4px; font-size: 13px; color: #1a73e8;">
            <strong>Total DIFAL da Nota:</strong> R$ ${row.TotalDIFAL}
          </p>
          
          <p style="margin: 8px 0 0; font-size: 11px; color: #777; word-break: break-all; background: #fff; padding: 6px; border-radius: 4px; border: 1px dashed #ddd;">
            <strong>Chave:</strong> ${row.Chave}
          </p>
          ${row.Obs_NF ? `<p style="margin: 6px 0 0; font-size: 12px; color: #d32f2f;"><strong>Obs:</strong> ${row.Obs_NF}</p>` : ""}
        </div>
        `;
        })
        .join("");

      difalHtml = `
        <div style="margin-top: 24px; border-top: 1px solid #e0e0e0; padding-top: 16px;">
          <h3 style="margin: 0 0 16px; color: #1a73e8; font-size: 16px;">📊 Informações para Emissão de GNRE (DIFAL)</h3>
          ${cardsHtml}
        </div>
      `;
    }

    try {
      await this.transporter.sendMail({
        from: `${envConfig.EMAIL_SENDER}`,
        cc: `${envConfig.EMAIL_CC}`,
        to: `${envConfig.EMAIL_RECIPIENT}`,
        subject: `NF-e e DIFAL — Envio de Notas | ${envConfig.CLIENT_NAME}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8f9fa; border-radius: 8px;">
            <div style="background: linear-gradient(135deg, #1a73e8, #0d47a1); padding: 20px 24px; border-radius: 8px 8px 0 0; color: #ffffff;">
              <h2 style="margin: 0; font-size: 18px;">📄 Notas Fiscais Eletrônicas</h2>
              <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Envio automático — ${envConfig.CLIENT_NAME}</p>
            </div>
            <div style="background: #ffffff; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
              <p style="margin: 0 0 16px; color: #333;">Prezados,</p>
              <p style="margin: 0 0 16px; color: #333;">
                Segue em anexo o arquivo ZIP contendo as notas fiscais eletrônicas (NF-e)
                emitidas pelo sistema Nérus.
              </p>
              
              ${difalHtml}

              <p style="margin: 24px 0 0; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 16px;">
                Este é um e-mail automático enviado pelo sistema de sincronização de NF-e — Nérus.
              </p>
            </div>
          </div>
        `,
        attachments: [{ filename: path.basename(file), path: file }],
      });

      Logger.success(
        "E-mail",
        "E-mail enviado com sucesso para todos os destinatários",
      );
    } catch (error) {
      Logger.error("E-mail", "Falha ao enviar e-mail via SMTP", error);
      throw error;
    }
  }
}
