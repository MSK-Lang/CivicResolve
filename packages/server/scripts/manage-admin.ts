/**
 * CivicResolve - First-Admin Provisioning and Access Management CLI
 *
 * This administrative script runs strictly server-side / out-of-band via trusted
 * execution environments (e.g. Cloud Shell, CI/CD pipeline, or local admin workstation).
 *
 * It NEVER exposes an HTTP endpoint, ensuring zero possibility of citizen self-promotion.
 *
 * Usage:
 *   npx tsx scripts/manage-admin.ts grant <email-or-uid>
 *   npx tsx scripts/manage-admin.ts revoke <email-or-uid>
 *   npx tsx scripts/manage-admin.ts check <email-or-uid>
 */

import admin from 'firebase-admin';
import { initFirebase, getAuth } from '../src/services/firebase.js';

export async function resolveUser(identifier: string): Promise<admin.auth.UserRecord> {
  const auth = getAuth();
  if (!auth) {
    throw new Error('Firebase Authentication is not initialized.');
  }

  if (identifier.includes('@')) {
    return await auth.getUserByEmail(identifier.trim());
  }
  return await auth.getUser(identifier.trim());
}

export async function grantAdminRole(identifier: string): Promise<admin.auth.UserRecord> {
  initFirebase();
  const auth = getAuth();
  if (!auth) {
    throw new Error('Firebase Authentication is not initialized.');
  }

  const user = await resolveUser(identifier);
  const existingClaims = user.customClaims || {};

  await auth.setCustomUserClaims(user.uid, {
    ...existingClaims,
    admin: true,
    role: 'admin'
  });

  console.log(`[SUCCESS] Admin claim successfully granted to: ${user.email || user.uid}`);
  console.log(`[INFO] User must sign out and sign in again (or force token refresh) to acquire updated token.`);
  return await resolveUser(identifier);
}

export async function revokeAdminRole(identifier: string): Promise<admin.auth.UserRecord> {
  initFirebase();
  const auth = getAuth();
  if (!auth) {
    throw new Error('Firebase Authentication is not initialized.');
  }

  const user = await resolveUser(identifier);
  const existingClaims = user.customClaims || {};

  const updatedClaims = { ...existingClaims };
  delete updatedClaims.admin;
  delete updatedClaims.role;

  await auth.setCustomUserClaims(user.uid, updatedClaims);
  // Invalidate all active refresh tokens immediately for the user
  await auth.revokeRefreshTokens(user.uid);

  console.log(`[SUCCESS] Admin privileges revoked for: ${user.email || user.uid}`);
  console.log(`[SECURITY] Refresh tokens revoked. Active sessions invalidated.`);
  return await resolveUser(identifier);
}

export async function checkUserRole(identifier: string): Promise<void> {
  initFirebase();
  const user = await resolveUser(identifier);
  console.log(`[USER INFO]`);
  console.log(`  UID: ${user.uid}`);
  console.log(`  Email: ${user.email || 'N/A'}`);
  console.log(`  Custom Claims:`, JSON.stringify(user.customClaims || {}, null, 2));
  console.log(`  Tokens Valid After: ${user.tokensValidAfterTime || 'N/A'}`);
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('manage-admin.ts')) {
  const action = process.argv[2];
  const target = process.argv[3];

  if (!action || !target) {
    console.error('Usage: npx tsx scripts/manage-admin.ts <grant|revoke|check> <email-or-uid>');
    process.exit(1);
  }

  (async () => {
    try {
      if (action === 'grant') {
        await grantAdminRole(target);
      } else if (action === 'revoke') {
        await revokeAdminRole(target);
      } else if (action === 'check') {
        await checkUserRole(target);
      } else {
        console.error(`Unknown action: ${action}. Use grant, revoke, or check.`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`[ERROR] Execution failed:`, (err as Error).message);
      process.exit(1);
    }
  })();
}
