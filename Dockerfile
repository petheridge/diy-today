# syntax=docker/dockerfile:1

# 1. Build the React client
FROM node:20-bookworm-slim AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# 2. Install production server dependencies (better-sqlite3 is a native module)
FROM node:20-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 3. Runtime image
FROM node:20-bookworm-slim
ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/data/diy-tasks.db
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json server.js ./
COPY --from=client /app/client/dist ./client/dist
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3001
CMD ["node", "server.js"]
