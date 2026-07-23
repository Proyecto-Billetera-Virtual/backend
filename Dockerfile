FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json tsconfig.json ./
RUN npm install --build-from-source
COPY src ./src
RUN npm run build
RUN npm prune --production

FROM node:20-slim
WORKDIR /app
RUN mkdir -p /app/data
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/server.js"]
