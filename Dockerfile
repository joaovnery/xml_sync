# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY tsconfig.json ./

COPY src/ ./src/

RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache tzdata \
    && cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime \
    && echo "America/Sao_Paulo" > /etc/timezone \
    && apk del tzdata

ENV TZ=America/Sao_Paulo

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN mkdir -p xmls_coletados && chown -R node:node xmls_coletados

USER node

CMD ["npm", "run", "prod"]
