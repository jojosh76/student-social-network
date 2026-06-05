FROM node:20-alpine

WORKDIR /app

COPY services/package*.json ./services/
RUN cd services && npm install --omit=dev

COPY services/shared ./services/shared
COPY services/content/package*.json ./services/content/
RUN cd services/content && npm install --omit=dev

COPY services/content ./services/content

WORKDIR /app/services/content
EXPOSE 5002
CMD ["node", "server.js"]
