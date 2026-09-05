# syntax=docker/dockerfile:1

# ---------- Fase de desarrollo ----------
# Se usa con docker compose. No copia el codigo: lo monta como volumen.
FROM node:22-bookworm-slim AS dev
WORKDIR /app
ENV NODE_ENV=development
RUN apt-get update && apt-get install -y --no-install-recommends \
      git python3 python3-pip python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/*
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---------- Fase de construccion ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- Fase de produccion (estatica) ----------
# Solo para probar el build en local. En produccion sirve Cloudflare Pages.
FROM nginx:1.27-alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
