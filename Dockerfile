FROM node:20-slim

WORKDIR /app

# Устанавливаем ffmpeg системный (нужен для музыки)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --only=production || npm install

COPY . .

CMD ["node", "index.js"]
