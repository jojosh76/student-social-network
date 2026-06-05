# Jenkins Setup

Use the root `Jenkinsfile` as the pipeline definition.

## Required agent tools

- Docker Engine with Docker Compose v2
- Node.js, for `node --check`
- PowerShell, because the current pipeline and smoke test use `.ps1`

## Basic pipeline flow

1. Validate backend and frontend JavaScript syntax.
2. Validate `backend/docker-compose.yml`.
3. Build all Docker images.
4. Start the stack.
5. Run `backend/scripts/smoke-test.ps1`.
6. Stop the stack.

## Production secrets

Create Jenkins credentials for:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `DATABASE_URL`
- `PUBLIC_BASE_URL`
- `FRONTEND_URL`

For local VPS deployment, copy `backend/.env.production.example` to `backend/.env` and replace every placeholder.
