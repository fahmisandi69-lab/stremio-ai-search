FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV ENABLE_LOGGING=false
ENV PORT=7000

EXPOSE 7000

CMD ["node", "server.js"]
