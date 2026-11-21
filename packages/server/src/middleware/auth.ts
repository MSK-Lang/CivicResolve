import type { FastifyRequest, FastifyReply } from 'fastify';
import { getAuth } from '../services/firebase.js';
import { env } from '../config/env.js';

export interface AdminAuthUser {
  uid: string;
  email?: string;
  role: 'admin';
}

declare module 'fastify' {
  interface FastifyRequest {
    adminUser?: AdminAuthUser;
  }
}

// Test-only verifier hook for isolated unit/integration tests without live network dependencies
type AuthVerifier = (token: string) => Promise<AdminAuthUser | null>;
let testAuthVerifier: AuthVerifier | null = null;

export function setAuthVerifierForTesting(verifier: AuthVerifier | null): void {
  if (env.NODE_ENV === 'production' && verifier !== null) {
    throw new Error('Test auth verifier cannot be configured in production mode.');
  }
  testAuthVerifier = verifier;
}

export function resetAuthVerifier(): void {
  testAuthVerifier = null;
}

/**
 * Middleware requiring valid administrative credentials.
 * Rejects unauthenticated requests, non-admin users, and client-forged roles.
 */
export async function requireAdminAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Bearer token required.'
    });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Bearer token cannot be empty.'
    });
  }

  // 1. Allow test hook during non-production testing if explicitly injected
  if (env.NODE_ENV !== 'production' && testAuthVerifier) {
    try {
      const verified = await testAuthVerifier(token);
      if (!verified) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or expired administrative token.'
        });
      }
      if (verified.role !== 'admin') {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'User lacks municipal administrative privileges.'
        });
      }
      request.adminUser = verified;
      return;
    } catch (err) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: `Token verification failed: ${(err as Error).message}`
      });
    }
  }

  // 2. Production / Real Firebase Admin Token Verification
  const auth = getAuth();
  if (!auth) {
    // If Firebase Auth is not configured, NEVER allow access through fake fallbacks.
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Firebase Authentication is not configured. Administrative endpoints are locked by default.'
    });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);

    // Verify administrative privileges strictly from server-verified token claims
    // Client-supplied headers or body flags are never trusted
    const hasAdminClaim = decodedToken.admin === true || decodedToken.role === 'admin';

    if (!hasAdminClaim) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'Access denied. Account lacks administrative privileges.'
      });
    }

    request.adminUser = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: 'admin'
    };
  } catch (err) {
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: `Invalid or revoked token: ${(err as Error).message}`
    });
  }
}
