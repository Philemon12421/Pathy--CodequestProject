# SafeTrack Spring Boot API

This folder is the Java/Spring Boot migration of the original TypeScript Node/Express backend.

## Run with Docker

```bash
docker compose up --build
```

The API runs on `http://localhost:4000` and PostgreSQL runs on port `5432`.

## API parity

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/health`
- `GET /api/incidents`
- `POST /api/incidents` multipart `media`
- `PATCH /api/incidents/{id}`
- `DELETE /api/incidents/{id}`
- `GET|POST|DELETE /api/routes`
- `PATCH /api/routes/{id}/favorite`
- `POST /api/ai/chat`, `GET /api/ai/history`, `DELETE /api/ai/history`
- `GET|POST|DELETE /api/music/tracks`
- `GET|POST /api/music/playlists`
- `POST|GET /api/music/playlists/{id}/tracks`
- `GET /api/ads`, `GET /api/ads/nearby`, `GET /api/ads/mine`
- `POST /api/ads`, `POST /api/ads/{id}/checkout`, `POST /api/ads/{id}/activate`, `DELETE /api/ads/{id}`

## TypeScript

`src/main/typescript/safetrack-client.ts` contains frontend-safe TypeScript types and a small fetch client for the Spring Boot API.

## Environment

Do not commit real API keys. Use environment variables or a local `.env` file for Docker Compose.
