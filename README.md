# 🚀 Pathy (formerly SafeTck)

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Inter&size=28&pause=1000&color=006c44&center=true&vCenter=true&width=700&lines=Navigate+Smarter.;Travel+Together.;AI-Powered+Navigation.;Community+Driven+Routes.;Welcome+to+Pathy." />
</p>

An AI-powered navigation, safety tracking, and community explorer platform. Users can discover and record routes, report real-time hazards or incidents on a live map, consult an intelligent AI travel assistant, play synchronized music, run localized business campaigns, and track travel achievements.

---

## 🏗️ System Architecture

Pathy is built on a modern, decoupled client-server architecture:

```mermaid
graph TD
    Client[📱 React Native / Expo Client]
    OSRM[🌐 OSRM Routing Engine]
    Nominatim[🗺️ Nominatim OpenStreetMap Geocoder]
    Backend[☕ Spring Boot 3.3 API Server]
    Postgres[(🐘 PostgreSQL Database)]
    Groq[🧠 GROQ LLM API]
    Paystack[💳 Paystack Payment Gateway]

    Client -->|1. Route Requests| OSRM
    Client -->|2. Search Coordinates| Nominatim
    Client -->|3. Save Routes / Auth / Incidents| Backend
    Backend -->|4. Persist Data| Postgres
    Backend -->|5. AI Chat Recommendations| Groq
    Backend -->|6. Ad Purchases & Activation| Paystack
```

---

## 🌟 Key Functional Features

### 1. Saved Routes & Feed
- **Your Routes**: A horizontal, swipeable gallery directly on the Home screen displaying personal saved route metrics (distance in km, duration, activity category, and quick-post buttons).
- **Interactive Map Picker**: Seamlessly select destinations using the in-app map search bar or by long-pressing anywhere on the map grid. The path is automatically generated via the OpenStreetMap routing API, displaying time/distance info, and returns you back to the form with all fields pre-filled.
- **Community Feed**: Post public routes with customizable captions, descriptions, and media. Fellow users can like, review, and comment on routes in real-time.

### 2. Live Incident Map & Alerts
- Real-time reporting of safety issues: **Accidents, Hazards, Crimes, Weather, and Custom alerts**.
- Interactive map markers colored dynamically by severity (Low, Medium, High, Critical) with automatic expiration countdowns.
- Detailed overlay sheets containing images, description metadata, and quick directions/navigation shortcuts.

### 3. Pathy AI Travel Companion
- AI Chat screen powered by the **GROQ API** using LLM completions.
- Provides tailored navigation tips, route safety suggestions, local warnings, and answers travel questions.
- Preserves a clean history of your messages locally and on the server database.

### 4. Merchant Ad Portal (Proximity Ads)
- Businesses can set up active advertisement zones with custom radiuses (in kilometers) on the map.
- Safe integration with **Paystack Payment Gateway** for purchasing ad space.
- Automatic device proximity alerts: alerts users when they approach a business's coordinates.

---

## 📂 Project Structure

```bash
PathyCodequestProject/
├── Frontend/                 # React Native / Expo Client
│   ├── assets/               # Local logos, icons, and image resources
│   ├── src/
│   │   ├── config/           # Theme palettes, dark mode context (useColors)
│   │   ├── screens/          # Application views (Home, Map, PostRoute, etc.)
│   │   ├── services/         # API abstraction layer (Axios wrappers)
│   │   └── store/            # Zustand global state (auth, incidents, ads, themes)
│   ├── App.tsx               # Main entrypoint, stack/tab navigators
│   └── .env                  # Client-side environment variables
│
├── backend/                  # Java / Spring Boot Microservice
│   ├── src/
│   │   ├── main/java/        # Spring boot controller, service, domain packages
│   │   └── main/resources/   # central application.yml properties
│   ├── Dockerfile            # Container configuration
│   ├── docker-compose.yml    # Database / caching orchestrator
│   └── .env                  # Secret keys (GROQ, PAYSTACK, database credentials)
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed locally:
- **Node.js** (v18+) & npm
- **Java JDK 21** & **Maven**
- **Docker Desktop** (optional, for database containerization)

---

### 1. Database Setup
You can spin up the PostgreSQL database instantly using Docker Compose inside the `backend` folder:
```bash
cd backend
docker compose up -d
```
*Alternatively, configure a local PostgreSQL database matching the credentials in `backend/src/main/resources/application.yml`.*

---

### 2. Run the Backend API
Create a `.env` file in the `backend` folder with the following variables:
```env
DB_URL=jdbc:postgresql://localhost:5432/safetrack
DB_USER=postgres
DB_PASSWORD=postgres
GROQ_API_KEY=your_groq_api_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
JWT_SECRET=your_super_secret_jwt_encryption_key
```

Run the Spring Boot application using Maven:
```bash
mvn clean install
mvn spring-boot:run
```
The server will start listening at `http://localhost:4000`.

---

### 3. Run the Mobile Frontend
Create a `.env` file in the `Frontend` folder pointing to your backend address:
```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api
```
*(If testing on a physical mobile device, replace `localhost` with your computer's local IP address e.g., `192.168.1.100` or use an active `ngrok` tunnel).*

Install packages and run the Expo development bundler:
```bash
cd Frontend
npm install
npm run start
```
Scan the QR code in your console using the **Expo Go** application on your iOS or Android device.

---

## ⚙️ Backend REST API Specification

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|:-------------:|
| `/api/auth/register` | `POST` | Create a new traveler account | No |
| `/api/auth/login` | `POST` | Authenticate credentials and return JWT token | No |
| `/api/auth/forgot-password` | `POST` | Trigger password reset verification email | No |
| `/api/auth/verify-reset` | `POST` | Confirm OTP validation code | No |
| `/api/auth/reset-password` | `POST` | Apply new secure account credentials | No |
| `/api/incidents` | `GET` | Retrieve list of nearby safety incidents | Yes |
| `/api/incidents` | `POST` | Post a new hazard with media uploads | Yes |
| `/api/routes` | `GET` | Retrieve saved routes for current user | Yes |
| `/api/routes` | `POST` | Save a newly selected route path | Yes |
| `/api/ai/chat` | `POST` | Query the Pathy AI Assistant | Yes |
| `/api/ads` | `GET` | Retrieve list of active ads | Yes |
| `/api/ads` | `POST` | Publish a merchant advertisement campaign | Yes |
| `/api/ads/{id}/activate` | `POST` | Process payment confirmation & launch ad | Yes |
