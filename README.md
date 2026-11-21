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
> Production-minded civic issue reporting, automated AI triage, and municipal dispatch platform.

---

## 1. Product and Architecture Overview

CivicResolve is a modern full-stack civic operations platform connecting citizens with municipal response departments. It packages both a high-performance React client and an enterprise Fastify backend into a **single self-contained container deployed on Google Cloud Run**:

- **Frontend (`packages/client`)**: React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, React Router, and an accessible WCAG AA design system following strict Anti-Slop editorial aesthetics.
- **Backend (`packages/server`)**: Fastify, TypeScript, Zod validation, rate limiting, and structured diagnostic health probes (`/healthz` and `/api/health`).
- **Data & AI Layer**: Google Cloud Firestore (Native mode), Google Cloud IAM least-privilege service accounts, and Google Gemini Generative AI for automated triage.
- **GeoCluster Engine**: Deterministic Haversine distance spatial clustering (500m radius threshold) to detect and manage duplicate citizen complaints without data loss.
- **Shared Contracts (`packages/shared`)**: Shared TypeScript schemas and Zod models ensuring strict end-to-end typed API contracts.
- **Deployment**: Multi-stage Dockerfile compiling both frontend and backend, serving static SPA assets directly from Fastify on `$PORT` (8080) in Google Cloud Run.

---

## 2. Key Features (Genuinely Implemented)

### A. Citizen Issue Reporting Journey
- **Intuitive Submission Flow**: File complaints across 8 municipal categories (Pothole, Sanitation, Street Lighting, Water Supply, Public Safety, Traffic Signals, Parks, Other).
- **Location Context**: Coarsened address and neighborhood capture, with optional GPS coordinates and zone types (School/Hospital Zone, Transit Corridor, Commercial, Residential).
- **Photo Evidence**: Client-side image validation (JPEG, PNG, WebP up to 5MB) with base64 stripping to prevent database bloat.
- **Indian Civic Localization**: Specialized form examples, Indian phone formatting, and INR currency conventions.

### B. Public Report Tracking and Verified Timeline
- **Instant Tracking Lookup (`/track` & `/track/:id`)**: Citizens enter their report UUID to monitor municipal dispatch, triage results, and resolution progress.
- **4-Stage Chronological Timeline**: Submitted, Triaged, In Progress, and Resolved milestones backed exclusively by verified backend audit timestamps without fabricated dates.
- **Privacy Protection**: Citizen contact information (name, email, phone) is strictly omitted from public views, and coordinates are coarsened to ~100m.
- **Official Audit Trail**: Expandable chronological log tracking timestamped system, AI, and administrative events.

### C. Google Gemini Multimodal AI Triage
- **Automated Categorization & Severity**: Evaluates title, description, context zone, and photo evidence.
- **Human Review Safeguard**: Automatically flags reports for human review if model confidence falls below 75% or safety risk indicates imminent danger.
- **Graceful Rules Fallback**: Deterministic rule-based fallback activates instantly if Gemini is unreachable, guaranteeing zero dropped citizen reports.

### D. Deterministic Priority Scoring Engine
- **Transparent Mathematical Scoring (0-100)**: Combines Severity (35 pts), Safety Risk (30 pts), Public Impact (20 pts), and Location Context (15 pts).
- **Service Level Agreements**: Maps scores to P1 Critical (4h), P2 High (24h), P3 Medium (72h), or P4 Low (168h) target SLAs.

### E. GeoCluster Duplicate Detection
- **Haversine Distance Matching**: Evaluates great-circle distance between complaints of the same category using a 500m initial radius.
- **Administrative Decision Workflow**: Municipal operators review detected duplicates via `GET /api/admin/clusters` and approve or reject links via `POST /api/admin/clusters/:id/decision`.
- **Zero Data Loss Guarantee**: Reports are never automatically merged or deleted; original records and audit histories are preserved in Firestore.

---

## 3. Google Cloud Integrations

| Google Cloud Service | Role & Implementation | Status |
| :--- | :--- | :--- |
| **Google Cloud Firestore** | Persistent Native-mode NoSQL database storing issues, clusters, and immutable audit logs. | Connected (`civicresolve-515407`) |
| **Google Gemini Generative AI** | Prompt-driven automated complaint evaluation via `@google/genai` with fallback resilience. | Integrated (`gemini-3.5-flash`) |
| **Google Cloud Run** | Serverless container runtime hosting Fastify and the React SPA on `$PORT` 8080. | Ready (`cloudbuild.yaml` + `Dockerfile`) |
| **Google Cloud Build** | Automated continuous build and deployment pipeline to Artifact / Container Registry. | Configured (`cloudbuild.yaml`) |
| **Google Cloud IAM** | Least-privilege runtime service account (`roles/datastore.user`). | Hardened |

---

## 4. API Endpoints

### Public Endpoints
- `GET /healthz` - Startup readiness and service diagnostic status (database, AI, auth).
- `GET /api/issues` - Paginated civic issue listing (PII redacted, coarsened coordinates).
- `GET /api/issues/:id` - Single report retrieval with verified timeline and audit history.
- `POST /api/issues` - Submit citizen complaint, trigger AI triage, and persist to Firestore.

### Administrative Endpoints
- `GET /api/admin/issues` - Full administrative listing with unredacted details and audit log.
- `GET /api/admin/issues/:id` - Full administrative detail view.
- `PATCH /api/admin/issues/:id` - Update status, urgency, or assign department with atomic audit event.
- `GET /api/admin/clusters` - Query detected duplicate report clusters within 500m radius.
- `POST /api/admin/clusters/:id/decision` - Approve or reject duplicate suggestion and persist to Firestore.

---

## 5. Local Setup and Development

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Quickstart
```bash
# 1. Install dependencies across workspaces
npm install

# 2. Build shared TypeScript contracts
npm run build:shared

# 3. Configure environment
cp .env.example .env
# Edit .env with your FIREBASE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS, and GEMINI_API_KEY

# 4. Start Development Servers
# Terminal 1: Backend Fastify server (http://localhost:3001)
npm run dev:server

# Terminal 2: Frontend Vite client (http://localhost:5173)
npm run dev:client
```

---

## 6. Google Cloud Run Deployment

Deploy directly from Google Cloud Shell or any environment with `gcloud` authenticated:

```bash
# Deploy to Google Cloud Run (asia-south1)
gcloud run deploy civicresolve \
  --source . \
  --project civicresolve-515407 \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,FIREBASE_PROJECT_ID=civicresolve-515407"
```

Or trigger an automated build using Cloud Build:

```bash
gcloud builds submit --config=cloudbuild.yaml --project=civicresolve-515407
```
