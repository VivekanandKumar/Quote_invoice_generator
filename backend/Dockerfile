FROM node:20-slim

ENV NODE_ENV=production

WORKDIR /app

# Install bun
RUN npm install -g bun

COPY package.json bun.lock ./
RUN bun install --production

COPY . .
RUN bun run build

EXPOSE 5000

CMD ["bun", "run", "start"]
