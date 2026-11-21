# CivicResolve: Administrative Provisioning & Access Control

This document defines the secure bootstrapping, verification, and revocation procedures for administrative users in CivicResolve.

---

## 1. Security Architecture & Threat Model

CivicResolve strictly enforces role-based access control (RBAC) via cryptographically signed Firebase Authentication Custom Claims:

```
[Citizen Client] ---> Signs in via Firebase Auth ---> Receives standard JWT without admin claims
[Admin Client]   ---> Signs in via Firebase Auth ---> Receives JWT with { admin: true, role: "admin" }
[Backend API]    ---> Cryptographically validates JWT audience, issuer, expiry, revocation, and admin claim
```

### Self-Promotion Prevention
- **No Self-Promotion Endpoints**: The application exposes **zero** public or client-accessible endpoints for assigning or requesting administrative privileges.
- **Client Forgery Resistance**: Headers such as `X-Admin: true` or request body properties like `{ isAdmin: true }` are discarded and ignored. All authorizations derive exclusively from server-verified Firebase ID token claims.
- **Fail-Closed Default**: If Firebase Authentication credentials are missing, administrative endpoints lock down by default (returning HTTP 401 Unauthorized).

---

## 2. First-Admin Provisioning Procedure

First-time administrative provisioning must be executed out-of-band using the Firebase Admin SDK inside a trusted environment (Google Cloud Shell, an authorized CI/CD pipeline, or an administrator's machine with authorized credentials).

### Option A: Using the CivicResolve Admin Script (Recommended)

1. Ensure the user has created an initial account via the client interface or Firebase Console.
2. Ensure `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` (or `GOOGLE_APPLICATION_CREDENTIALS`) are configured in `.env`.
3. Run the provisioning script from the repository root:

```bash
# Grant administrative claim by user email or UID
npx tsx packages/server/scripts/manage-admin.ts grant supervisor@citygov.org
```

4. Verify that the custom claims are applied:

```bash
npx tsx packages/server/scripts/manage-admin.ts check supervisor@citygov.org
```

5. The user must sign out and sign in again (or trigger `user.getIdToken(true)` in the client) to receive a fresh JWT containing the administrative claim.

---

### Option B: Using Google Cloud Shell / Node.js REPL

In situations where CLI scripts cannot be executed locally, run this snippet directly inside Google Cloud Shell:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

async function makeAdmin(email) {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true, role: 'admin' });
  console.log(`Successfully granted admin privileges to ${user.email} (${user.uid})`);
}

makeAdmin('supervisor@citygov.org');
```

---

## 3. Administrative Access Revocation Procedure

When an administrator leaves the organization or changes roles, administrative access must be revoked immediately:

### Step 1: Revoke Custom Claims
Run the administrative script:

```bash
npx tsx packages/server/scripts/manage-admin.ts revoke former.supervisor@citygov.org
```

This removes `{ admin: true, role: 'admin' }` from the user's custom claims.

### Step 2: Instant Token Invalidation
The script automatically executes `admin.auth().revokeRefreshTokens(user.uid)`.

Because the CivicResolve backend verifies tokens with `checkRevoked: true` on all administrative endpoints (`/api/admin/*` and `/api/triage/test`), the user's active session is rejected with HTTP 401 Unauthorized immediately, without having to wait for the standard 1-hour JWT expiration window.

---

## 4. Periodic Audit and Hygiene

1. **Regular Role Auditing**: Review all users holding administrative claims at least quarterly using the Firebase Admin SDK or Firebase Console.
2. **Dedicated Administrative Accounts**: Administrative staff should use dedicated municipal email addresses (e.g., `@citygov.org`) rather than personal emails.
3. **Session Revocation upon Credential Changes**: Always revoke refresh tokens upon password reset or device change.
