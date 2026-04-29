FROM node:20-alpine
RUN apk add --no-cache npm
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "index.js"]
