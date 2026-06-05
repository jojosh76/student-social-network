# Campus Link / Student Social Network

The project is organized into two main folders:

- `frontend/` - HTML, CSS, browser JavaScript, adapters, DTOs, and frontend assets.
- `backend/` - API gateway, five backend services, PostgreSQL schema, Dockerfiles, and Docker Compose.

Backend quick start:

```powershell
cd backend
docker compose up --build
```

The frontend is exposed on `http://localhost:8088`.
The gateway is exposed on `http://localhost:3100` to avoid clashing with other local projects.

Backend smoke test:

```powershell
cd backend
.\scripts\smoke-test.ps1
```

Jenkins pipeline:

```text
Jenkinsfile
```

It validates JavaScript, validates Docker Compose, builds images, starts the stack, runs the smoke test, then stops the stack.

Frontend entry point without Docker:

```text
frontend/index.html
```
