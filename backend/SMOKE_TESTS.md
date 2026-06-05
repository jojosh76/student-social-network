# Backend Smoke Tests

After building the images, start the backend stack:

```powershell
cd backend
docker compose up -d
```

Then run:

```powershell
.\scripts\smoke-test.ps1
```

The script checks:

- Gateway health
- User registration
- JWT-backed `/api/auth/me`
- Post creation
- Post like
- Upcoming events
- Event join
- Notifications

Current host ports:

| Component | URL |
| --- | --- |
| Gateway | `http://localhost:3100` |
| Auth service | `http://localhost:5100` |
| Messaging service | `http://localhost:5101` |
| Content service | `http://localhost:5102` |
| Users service | `http://localhost:5103` |
| Files service | `http://localhost:5106` |
| PostgreSQL | `localhost:55432` |
