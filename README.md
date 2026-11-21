# CivicResolve

### Turning citizen complaints into actionable civic intelligence.

CivicResolve is an AI-powered civic issue reporting and resolution platform designed to bridge the gap between citizens and local authorities.

Traditional civic complaint systems often treat every report as an isolated request. Duplicate complaints, fragmented information, delayed prioritization and limited transparency make it difficult for authorities to identify what needs attention most.

CivicResolve takes a different approach.

Citizens can report local issues with descriptions, photographs and location information. The platform uses Google Gemini to interpret submitted reports, extract relevant information and assist with issue classification. A deterministic priority engine evaluates severity and public impact, while intelligent geographic clustering helps identify potentially related complaints.

On the administrative side, civic authorities get a centralized interface to review reports, identify recurring problems, prioritize interventions and manage resolution workflows. Citizens can track their reports and follow their progress through the resolution lifecycle.

**The goal is simple: move civic governance from fragmented complaint collection towards structured, transparent and data-informed problem resolution.**

### What makes CivicResolve different?

- **AI-assisted issue intelligence:** Multimodal analysis of citizen descriptions and photographic evidence using Google Gemini.
- **Explainable prioritization:** Deterministic priority scoring based on issue severity and public impact.
- **Geographic intelligence:** Identification of potentially related complaints based on proximity and issue similarity.
- **Transparent resolution:** Report tracking, administrative workflows and auditable status updates.
- **Citizen-first reporting:** A straightforward way to submit local issues and follow their progress.

### Built with Google Technologies

CivicResolve leverages Google Cloud and Firebase infrastructure, including Google Gemini for AI-assisted analysis, Cloud Firestore for persistent data, Firebase Storage for evidence uploads and Google Cloud Run for application deployment.

> PromptWars GDG PSG iTech x H2S Hackathon Platform
> Production-minded, minimal full-stack foundation for citizen-first civic issue reporting and municipal AI triage.

---

## 1. Architecture Overview

CivicResolve is built as a minimal full-stack monorepo designed to deploy as a **single self-contained container on Google Cloud Run**:

- **Frontend (`packages/client`)**: React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, React Router, accessible WCAG AA design system.
- **Backend (`packages/server`)**: Fastify, TypeScript, Zod environment validation, centralized error handling, health endpoints (`/healthz` and `/api/health`).
- **Data & AI Layer**: Firebase Firestore, Firebase Authentication, and Google Gemini Generative AI for automated triage.
- **Shared Contracts (`packages/shared`)**: Shared TypeScript schemas and Zod models ensuring end-to-end typed API contracts.
- **Deployment**: Multi-stage Dockerfile that compiles the frontend and backend, serving static SPA assets directly from Fastify on `$PORT` (8080) in Google Cloud Run.

---

## 2. Monorepo Structure

```text
CivicResolve/
├── Dockerfile                  # Production multi-stage Docker build for Google Cloud Run
├── .dockerignore
├── .gitignore
├── .env.example                # Sample environment configuration (never commit secrets)
├── package.json                # Monorepo workspaces manifest
├── tsconfig.base.json          # Root TypeScript configuration
├── packages/
│   ├── shared/                 # Shared schemas, DTOs and TypeScript models
│   │   ├── src/index.ts
│   │   └── package.json
│   ├── server/                 # Fastify backend service
│   │   ├── src/
│   │   │   ├── app.ts          # Fastify instance, CORS, static SPA handler, error handler
│   │   │   ├── index.ts        # Server entry point
│   │   │   ├── config/env.ts   # Zod environment variable validation
│   │   │   ├── routes/
│   │   │   │   ├── health.ts   # /healthz and /api/health probes
│   │   │   │   └── issues.ts   # Civic report CRUD and AI triage
│   │   │   └── services/
│   │   │       ├── firebase.ts # Firestore & Auth connectors with in-memory fallback
│   │   │       └── gemini.ts   # Google Gemini prompt-driven municipal triage
│   │   └── package.json
│   └── client/                 # React + Vite frontend application
│       ├── src/
│       │   ├── App.tsx         # Routing and main app shell
│       │   ├── components/     # Accessible Navbar, Footer, IssueCard, UIStates
│       │   ├── pages/          # Dashboard, Report Issue, Detail, Health Status
│       │   └── lib/            # Typed API client and Firebase initialization
│       ├── tailwind.config.js  # Civic accessible color palette and focus styles
│       ├── vite.config.ts      # Vite dev server with /api proxy to Fastify
│       └── package.json
```

---

## 3. Required Credentials and Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Environment Keys:

| Variable | Description | Where to get it |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API Key | [Google AI Studio](https://aistudio.google.com/) |
| `FIREBASE_PROJECT_ID` | Firebase / GCP Project ID | [Firebase Console](https://console.firebase.google.com/) |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin Service Account Email | Firebase Console -> Project Settings -> Service Accounts |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin Private Key | Firebase Console -> Project Settings -> Service Accounts |
| `VITE_FIREBASE_API_KEY` | Firebase Web Client API Key | Firebase Console -> Project Settings -> Web App |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Web Auth Domain | Firebase Console -> Project Settings -> Web App |
| `VITE_FIREBASE_APP_ID` | Firebase Web Application ID | Firebase Console -> Project Settings -> Web App |

> **Graceful Fallback Mode**: If credentials are not yet configured during local testing, the backend automatically boots in **safe fallback mode** (in-memory store + rule-based triage) and reports current readiness on the `/health` page without crashing.

---

## 4. Local Development

### Prerequisites:
- Node.js >= 20.x (Recommended: Node 22)
- npm >= 10.x

### Install dependencies:
```bash
npm install
```

### Compile shared contracts:
```bash
npm run build:shared
```

### Run Backend and Frontend concurrently:
Open two terminals:

```bash
# Terminal 1: Backend Server (runs on http://localhost:3001)
npm run dev:server

# Terminal 2: Frontend Client with Vite (runs on http://localhost:5173)
npm run dev:client
```

---

## 5. Production Build Verification

Verify that all packages compile and bundle cleanly:

```bash
npm run build
```

This compiles:
1. `@civicresolve/shared` -> `packages/shared/dist/`
2. `@civicresolve/client` -> `packages/client/dist/`
3. `@civicresolve/server` -> `packages/server/dist/`

### Test Single-Container Production Run Locally:
```bash
NODE_ENV=production PORT=8080 npm run start
```
Visit `http://localhost:8080/` in your browser. Fastify will serve the client SPA and the API routes from a single process.

---

## 6. Google Cloud Run Deployment

Google Cloud Run automatically injects `$PORT` (default 8080) and uses Google Application Default Credentials (ADC).

### Step 1: Set Google Cloud Project
```bash
gcloud config set project YOUR_GCP_PROJECT_ID
```

### Step 2: Build and Deploy to Cloud Run
```bash
gcloud run deploy civicresolve \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

Cloud Run will use the root `Dockerfile`, build both tiers, and launch the single container with SSL and automatic horizontal scaling.
