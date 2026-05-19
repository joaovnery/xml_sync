# XML Sync

Robô interno da **Nérus** que automatiza a coleta, compactação e envio por e-mail dos XMLs de NF-e.

---

## O que ele faz?

1. **Consulta o banco MySQL** e coleta todos os XMLs de notas fiscais emitidas dentro de um período.
2. **Compacta** todos os XMLs em um único arquivo `.zip`.
3. **Envia por e-mail** o `.zip` para o(s) destinatário(s) configurado(s).
4. **Notifica no Google Chat** que a sincronização foi concluída (ou falhou).

Tudo isso roda automaticamente via **cron schedule** configurável.

---

## Como funciona?

O sistema sobe um servidor Express e agenda um `cron job`. A cada execução do cron, o fluxo é:

```
Cron dispara
  → XmlService consulta o banco (NF-e do período)
  → StorageService compacta os XMLs em .zip
  → MailService envia o .zip por e-mail
  → ChatService notifica no Google Chat
```

### Modos de operação

| Variável             | Comportamento                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `USE_FIX_DATE=false` | **Modo dinâmico** (padrão) — usa `LOOKBACKDAYS` para calcular o período automaticamente. Ex: `LOOKBACKDAYS=7` coleta os últimos 7 dias. |
| `USE_FIX_DATE=true`  | **Modo fixo** — usa as datas exatas de `INI_DATE` e `END_DATE` do `.env`. Útil para reprocessar um período específico.                  |

---

## Variáveis de Ambiente (.env)

```env
PORT=3333

## SMTP (conta Google usada para autenticar o envio)
EMAIL_USER=suporteo2@nerus.com.br
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

## Remetente e destinatário do e-mail com os XMLs
EMAIL_SENDER=suporteo2@nerus.com.br
EMAIL_RECIPIENT=destinatario@email.com

## Webhook do Google Chat para notificações
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/...

## Agendamento (sintaxe cron)
CRON_SCHEDULE="0 8 * * 1"

## Período de coleta
USE_FIX_DATE=false
INI_DATE=20260401
END_DATE=20260430
LOOKBACKDAYS=7

## MySQL (banco do  no servidor)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=_user
DB_PASSWORD=_password
DB_NAME=
```

### Detalhes importantes

- `EMAIL_USER` + `EMAIL_APP_PASSWORD` → Credenciais SMTP do Gmail (App Password). É a conta que **autentica** o envio.
- `EMAIL_SENDER` → Endereço que aparece como remetente no e-mail.
- `EMAIL_RECIPIENT` → Para quem o e-mail será enviado.
- `CRON_SCHEDULE` → Expressão cron padrão. Exemplos:
  - `"0 8 * * 1"` → Toda segunda-feira às 8h
  - `"0 8 * * *"` → Todo dia às 8h
  - `"*/5 * * * *"` → A cada 5 minutos (útil para testes)
- `LOOKBACKDAYS` → Quantos dias para trás coletar (modo dinâmico). Ex: `7` = última semana.

---

## Como rodar

### Desenvolvimento local

```bash
# 1. Instalar dependências
npm install

# 2. Criar o arquivo .env com as variáveis acima

# 3. Rodar em modo dev (com hot-reload)
npm run dev
```

### Produção com Docker

#### 1. Build e push da imagem

```bash
# Build
docker build -t jnery/_xml_sync:latest .

# Push para o Docker Hub
docker push jnery/_xml_sync:latest
```

#### 2. Deploy no servidor (EC2)

No servidor, basta ter o `docker-compose.yml` e o `.env` configurado:

```bash
# Subir o container
docker compose up -d

# Ver os logs
docker compose logs -f

# Parar
docker compose down
```

O `docker-compose.yml` já monta o volume `./xmlsColetados` para persistir os ZIPs gerados e configura o `restart: always` para reiniciar automaticamente.

> **Nota:** O container já vem configurado com o timezone `America/Sao_Paulo` (horário de Brasília).

---

## Estrutura do Projeto

```
src/
├── index.ts                  # Entry point — sobe o Express e inicia o cron
├── config/
│   └── database.ts           # Pool de conexão MySQL
├── jobs/
│   └── cron.ts               # Agendamento e orquestração do fluxo
├── services/
│   ├── xmlService.ts         # Consulta os XMLs no banco
│   ├── storageService.ts     # Compacta XMLs em .zip
│   ├── mailService.ts        # Envia o .zip por e-mail (SMTP/Gmail)
│   └── chatService.ts        # Notifica no Google Chat via webhook
└── utils/
    └── date.utils.ts         # Cálculo de datas do período
```

---

## Tecnologias

- **Node.js 20** + **TypeScript**
- **Express** — servidor HTTP
- **node-cron** — agendamento de tarefas
- **mysql2** — conexão com o banco MySQL do
- **archiver** — compactação dos XMLs em ZIP
- **nodemailer** — envio de e-mail via SMTP/Gmail
- **Docker** — containerização para deploy
