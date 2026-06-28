# Project Overview – Pathy (Codequest Project)

## 1. Front‑end (Mobile App)

| Component | Technology | Purpose |
|-----------|------------|---------|
| UI Framework | **React Native** (Expo SDK 54) | Build cross‑platform native UI for iOS, Android, and Web.
| Language | **TypeScript** | Adds static typing, improves developer productivity and reduces runtime errors.
| State Management | **Zustand** | Simple and performant global state handling.
| Data Fetching | **TanStack Query** | Caching, background refetching, and request deduplication for API calls.
| Forms & Validation | **React Hook Form** + **Zod** | Declarative form handling with schema‑based validation.
| Animations | **React Native Reanimated** | Smooth, native‑driven UI animations.
| Maps | **React Native Maps** | Display interactive maps for route recording and navigation.
| Routing (app navigation) | **Expo Router** | File‑based navigation throughout the app.
| Environment variables | **.env** (Expo) | Stores API endpoint (`EXPO_PUBLIC_API_URL`) and other config.

## 2. Back‑end (Microservice)

| Component | Technology / Library | Role |
|-----------|----------------------|------|
| Framework | **Spring Boot 3.3.7** (Java 21) | Provides a lightweight, production‑ready REST API server.
| Build tool | **Maven** (`pom.xml`) | Dependency management, build lifecycle, and creation of an executable JAR.
| Database | **PostgreSQL** | Persistent storage for users, routes, incidents, etc.
| ORM / JDBC | **spring‑boot‑starter‑jdbc** | JDBC connectivity to PostgreSQL.
| Security | **Spring Security Crypto** + **jjwt (0.12.6)** | Password hashing, JWT token creation/validation for auth.
| API Controllers | Java classes under `src/main/java/com/safetrack/api/controller/*` | Implement endpoints for ads, AI, auth, incidents, music, routes, etc.
| Service layer | `src/main/java/com/safetrack/api/service/*` | Business logic, file storage handling, etc.
| Configuration | `src/main/resources/application.yml` | Central config (datasource, JWT secret, server port, etc.).
| Dockerization | **Dockerfile** + **docker‑compose.yml** | Containerises the service and its dependencies (PostgreSQL, Redis).
| Environment variables | `backend/.env` | Holds secret keys (GROQ, PAYSTACK, etc.) used by the service.

## 3. Infrastructure & DevOps

- **Docker** – isolates the backend service and its database; `docker-compose.yml` orchestrates multiple containers.
- **ngrok** – exposes the local backend (`localhost:4000`) to the internet, enabling the mobile app to reach the API during development.
- **Git** – version control, remote repository on GitHub (`https://github.com/Philemon12421/Pathy--CodequestProject.git`).
- **GitHub Actions / CI (not shown)** – typical pipelines would build the Java JAR and run tests.

## 4. Third‑party Services & APIs

| Service | Use case |
|---------|----------|
| **GROQ** (`GROQ_API_KEY`) | AI/LLM endpoint used by the Pathy AI assistant.
| **Paystack** (`PAYSTACK_SECRET_KEY`) | Payment processing for in‑app purchases or subscriptions.
| **Expo** | Build, run, and publish the React Native app. Handles OTA updates.
| **Ngrok** | Temporary public URL for the backend during local development.

## 5. Project Structure (high‑level)

```
PathyCodequestProject/
│
├── Frontend/                # React Native source (tsx, assets, etc.)
│   ├── app/                 # Screens and navigation
│   ├── components/          # Reusable UI components
│   ├── hooks/               # Custom hooks (e.g., useAuth)
│   ├── services/            # API client wrappers
│   ├── store/               # Zustand stores
│   └── ...
│
├── Backend/                 # Spring Boot microservice
│   ├── src/main/java/...    # Java source code (controllers, services)
│   ├── src/main/resources/  # application.yml, static files
│   ├── Dockerfile           # Docker image definition
│   ├── docker-compose.yml   # Compose file (includes PostgreSQL, Redis)
│   ├── pom.xml              # Maven build file
│   └── .env                 # Secrets for the service
│
├── .gitignore               # Git ignore rules (frontend + backend)
├── README.md                # Project description (already in repo)
└── PROJECT_OVERVIEW.md      # **This file** – full tech stack and purpose
```

## 6. How the pieces work together
1. **Developer runs ngrok** → creates a public HTTPS URL that forwards to `localhost:4000` where the Spring Boot API is listening.
2. **Expo app** reads `EXPO_PUBLIC_API_URL` from its `.env` (populated with the ngrok URL) and makes HTTP requests to the backend.
3. Backend validates JWT tokens, accesses PostgreSQL, performs business logic, and returns JSON responses.
4. Front‑end consumes those responses via TanStack Query, updates UI state with Zustand, and renders maps, routes, and AI‑generated suggestions.
5. Optional payments processed via Paystack; AI calls routed through GROQ.
6. Docker ensures the backend can be run consistently on any machine or CI environment.

---
*This document is intended as a quick reference for anyone onboarding the Pathy project, explaining the role of each technology and how they interoperate.*
