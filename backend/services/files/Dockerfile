FROM node:20-alpine

WORKDIR /app

COPY services/package*.json ./services/
RUN cd services && npm install --omit=dev

COPY services/shared ./services/shared
COPY services/files/package*.json ./services/files/
RUN cd services/files && npm install --omit=dev

COPY services/files ./services/files
RUN mkdir -p /app/services/files/uploads

WORKDIR /app/services/files
EXPOSE 5006
CMD ["node", "server.js"]
