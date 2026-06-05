FROM node:20-alpine

WORKDIR /app

COPY services/package*.json ./services/
RUN cd services && npm install --omit=dev

COPY services/shared ./services/shared
COPY services/users/package*.json ./services/users/
RUN cd services/users && npm install --omit=dev

COPY services/users ./services/users

WORKDIR /app/services/users
EXPOSE 5003
CMD ["node", "server.js"]
