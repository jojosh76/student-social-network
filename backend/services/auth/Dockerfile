FROM node:20-alpine

WORKDIR /app

COPY services/package*.json ./services/
RUN cd services && npm install --omit=dev

COPY services/shared ./services/shared
COPY services/auth/package*.json ./services/auth/
RUN cd services/auth && npm install --omit=dev

COPY services/auth ./services/auth

WORKDIR /app/services/auth
EXPOSE 5000
CMD ["node", "server.js"]
