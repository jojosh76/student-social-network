# Campus Link Backend Foundation

This backend uses a 5-service SOA layout behind the API Gateway.

## Services

| Service | Port | Responsibility |
| --- | ---: | --- |
| Gateway | 3000 | JWT guard, rate limiting, routing, WebSocket bridge |
| Auth | 5000 | Register, login, current user, logout |
| Messaging | 5001 | Conversations, messages, Socket.IO chat |
| Content | 5002 | Posts, likes, events, notifications, search |
| Users | 5003 | Profiles, online users, avatars |
| Files | 5006 | Uploads and file metadata |
| PostgreSQL | 5432 | Persistent data |

## Run With Docker

```powershell
cd backend
docker compose up --build
```

Host ports are mapped to avoid common local conflicts:

| Container | Internal Port | Host Port |
| --- | ---: | ---: |
| Gateway | 3000 | 3100 |
| Frontend | 80 | 8088 |
| Auth | 5000 | 5100 |
| Messaging | 5001 | 5101 |
| Content | 5002 | 5102 |
| Users | 5003 | 5103 |
| Files | 5006 | 5106 |
| PostgreSQL | 5432 | 55432 |

PostgreSQL loads `database/schema.sql` automatically on first startup.

Run a backend smoke test after the stack starts:

```powershell
.\scripts\smoke-test.ps1
```

## Gateway Routes

| Frontend Route | Service |
| --- | --- |
| `http://localhost:3100/api/auth/*` | Auth |
| `http://localhost:3100/api/users/*` | Users |
| `http://localhost:3100/api/posts/*` | Content |
| `http://localhost:3100/api/events/*` | Content |
| `http://localhost:3100/api/notifications/*` | Content |
| `http://localhost:3100/api/search/*` | Content |
| `http://localhost:3100/api/conversations/*` | Messaging |
| `http://localhost:3100/api/upload/*` | Files |
| `ws://localhost:3100/chat` | Messaging through Gateway |

## Local Run Without Docker

Install dependencies in the shared services root and each service:

```powershell
cd backend
cd services
npm install
cd auth; npm install
cd ../users; npm install
cd ../content; npm install
cd ../messaging; npm install
cd ../files; npm install
cd ../../gateway; npm install
```

Set `DATABASE_URL`, then start PostgreSQL and each service with `npm start`.
