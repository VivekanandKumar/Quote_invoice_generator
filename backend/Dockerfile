FROM node:20-slim

# Install Chromium and fonts required for Puppeteer PDF generation
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

# Install bun
RUN npm install -g bun

COPY package.json ./
RUN bun install

COPY . .
RUN bun run build

EXPOSE 5000

CMD ["bun", "run", "start"]
