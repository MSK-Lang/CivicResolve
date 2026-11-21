# CivicResolve: Google Cloud IAM Least-Privilege Guide

This document defines the strict least-privilege Identity and Access Management (IAM) role architecture for CivicResolve on Google Cloud Platform and Cloud Run.

---

## 1. Separation of Concerns: Deployment vs Runtime Roles

CivicResolve strictly decouples the **Deployment Identity** (used by developers or CI/CD pipelines to build and deploy containers) from the **Runtime Service Account** (the identity assumed by the running Cloud Run container revision).

```
[Developer / GitHub Actions] ---> Deployment Identity (builds, pushes images, deploys revisions)
                                           |
                                           v
                                   [Cloud Run Service]
                                           |
                                           v
[Assumed Runtime Identity]   ---> Runtime Service Account (queries Firestore, uploads to Storage)
```

---

## 2. Runtime Service Account Permissions (Least Privilege)

Create a dedicated runtime service account (e.g., `civicresolve-runtime@<project-id>.iam.gserviceaccount.com`). Attach this service account to the Cloud Run service via `--service-account`.

### Minimal Required Roles

| IAM Role | Role ID | Justification & Operations Performed |
|---|---|---|
| **Cloud Datastore User** | `roles/datastore.user` | Grants read, write, query, and transactional access to Google Cloud Firestore (`issues` collection). Required for report persistence, priority scores, and append-only audit tracking. |
| **Storage Object Admin** | `roles/storage.objectAdmin` | Grants permission to upload, read, and delete citizen evidence photos in the project's designated Firebase Storage bucket. *(Scoped strictly to `gs://<project-id>.appspot.com`)*. |

### Permissions Explicitly Omitted (Anti-Pattern Avoidance)

| Omitted Role | Why It Is Strictly Excluded |
|---|---|
| **`roles/firebaseauth.admin`** | **CRITICAL**: Verifying Firebase Authentication JWTs (`admin.auth().verifyIdToken()`) uses public key cryptography against Google's public x509 cert endpoint (`https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`). It does **not** require IAM administrative privileges. Granting full Firebase Auth Admin violates least privilege. |
| **`roles/owner` or `roles/editor`** | Over-privileged primitive roles that grant wide administrative control across all Google Cloud APIs in the project. Strictly forbidden in production. |
| **`roles/iam.serviceAccountUser`** | Not needed by the runtime container. Only needed by deployers to attach service accounts to resources. |

---

## 3. Deployment Identity Permissions (CI/CD & Developers)

The deployer identity (e.g., GitHub Actions Workload Identity Pool or developer identity) requires permissions to package, upload, and update the Cloud Run revision:

| IAM Role | Role ID | Purpose |
|---|---|---|
| **Cloud Run Admin** | `roles/run.admin` | Create, update, and manage Cloud Run revisions and traffic routing. |
| **Service Account User** | `roles/iam.serviceAccountUser` | Allows the deployer to bind the dedicated runtime service account (`civicresolve-runtime`) to the Cloud Run service. |
| **Artifact Registry Writer** | `roles/artifactregistry.writer` | Allows pushing built multi-stage Docker container images to Google Artifact Registry. |

---

## 4. Google Cloud CLI Provisioning Commands

Execute the following commands in Google Cloud Shell or terminal:

### Step 1: Create Dedicated Runtime Service Account
```bash
gcloud iam service-accounts create civicresolve-runtime \
  --description="Runtime service account for CivicResolve Cloud Run container" \
  --display-name="CivicResolve Runtime SA"
```

### Step 2: Grant Least-Privilege Runtime Roles
```bash
# 1. Firestore Read/Write Access
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:civicresolve-runtime@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# 2. Cloud Storage Access (Scoped to issues bucket)
gcloud storage buckets add-iam-policy-binding gs://PROJECT_ID.appspot.com \
  --member="serviceAccount:civicresolve-runtime@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### Step 3: Deploy Cloud Run Service Attached to Runtime SA
```bash
gcloud run deploy civicresolve \
  --image="LOCATION-docker.pkg.dev/PROJECT_ID/civicresolve-repo/civicresolve:latest" \
  --platform=managed \
  --region=us-central1 \
  --service-account="civicresolve-runtime@PROJECT_ID.iam.gserviceaccount.com" \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,FIREBASE_PROJECT_ID=PROJECT_ID,GEMINI_API_KEY=YOUR_GEMINI_KEY"
```
