FROM node:20-alpine

WORKDIR /app

COPY services/package*.json ./services/
RUN cd services && npm install --omit=dev

COPY services/shared ./services/shared
COPY services/messaging/package*.json ./services/messaging/
RUN cd services/messaging && npm install --omit=dev

COPY services/messaging ./services/messaging

WORKDIR /app/services/messaging
EXPOSE 5001
CMD ["node", "server.js"]
