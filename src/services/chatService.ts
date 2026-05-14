export class ChatService {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL || "";
  }

  public async sendMessage(
    quantityXmls: number,
    iniDate: string,
    endDate: string,
  ) {
    try {
      console.log(
        "\n[Chat Service] Enviando notificação para o Google Chat...",
      );

      const message = `Notas sincronizadas e enviadas com sucesso - data do periodo ${iniDate} a ${endDate} - Quantidade de XMLs coletados: ${quantityXmls}`;

      await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });

      console.log("[Chat Service] Notificação Enviada com sucesso!\n");
    } catch (error) {
      const message = `[Chat Service] Alerta - Falha na sincronização de XMLs - Robo falhou.* ${error}`;

      await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });
    }
  }
}
