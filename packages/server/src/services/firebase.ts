import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import type { CivicIssue, ImageMetadata, CivicIssueCategory, CivicIssueStatus, ReportAuditEvent } from '@civicresolve/shared';

let isFirebaseInitialized = false;
let firestoreDb: admin.firestore.Firestore | null = null;
let firebaseAuth: admin.auth.Auth | null = null;
let firebaseBucket: any = null;

// In-memory fallback repository strictly for local development and testing
const inMemoryIssues = new Map<string, CivicIssue>();

export interface FirebaseDiagnostics {
  isReady: boolean;
  persistenceMode: 'firestore' | 'in_memory';
  authReady: boolean;
  storageReady: boolean;
  projectId?: string;
  missingConfig: string[];
  recommendations: string[];
}

export function getFirebaseDiagnostics(): FirebaseDiagnostics {
  const missing: string[] = [];
  if (!env.FIREBASE_PROJECT_ID) missing.push('FIREBASE_PROJECT_ID');
  if (!env.FIREBASE_CLIENT_EMAIL && !env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE) {
    missing.push('FIREBASE_CLIENT_EMAIL or GOOGLE_APPLICATION_CREDENTIALS');
  }
  if (!env.FIREBASE_PRIVATE_KEY && !env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE) {
    missing.push('FIREBASE_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS');
  }

  const recommendations: string[] = [];
  if (missing.length > 0) {
    recommendations.push(
      'For Cloud Run deployment: Attach a service account with IAM roles "roles/datastore.user" and "roles/storage.objectAdmin", and set FIREBASE_PROJECT_ID.'
    );
    recommendations.push(
      'For local testing with live Firebase: Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.'
    );
  }

  return {
    isReady: isFirebaseReady(),
    persistenceMode: isFirebaseReady() ? 'firestore' : 'in_memory',
    authReady: firebaseAuth !== null,
    storageReady: firebaseBucket !== null,
    projectId: env.FIREBASE_PROJECT_ID,
    missingConfig: missing,
    recommendations
  };
}

function setupFirestore(): void {
  firestoreDb = admin.firestore();
  firestoreDb.settings({ ignoreUndefinedProperties: true });
  firebaseAuth = admin.auth();
  try {
    firebaseBucket = admin.storage().bucket();
  } catch {
    firebaseBucket = null;
  }
}

export function initFirebase(): void {
  // Prevent tests from ever polluting live Firestore
  if (
    process.env.NODE_ENV === 'test' ||
    env.NODE_ENV === 'test' ||
    process.argv.some(arg => arg.includes('test'))
  ) {
    console.log('Test environment active. Enforcing in-memory store.');
    isFirebaseInitialized = false;
    firestoreDb = null;
    return;
  }

  if (admin.apps.length > 0) {
    isFirebaseInitialized = true;
    setupFirestore();
    return;
  }

  // Attempt 1: Explicit service account credentials via environment variables
  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    try {
      const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey
        }),
        storageBucket: env.FIREBASE_PROJECT_ID ? `${env.FIREBASE_PROJECT_ID}.appspot.com` : undefined
      });
      isFirebaseInitialized = true;
      setupFirestore();
      console.log('Firebase Admin initialized with explicit service account credentials.');
      return;
    } catch (err) {
      console.warn('Failed to initialize Firebase with explicit service account:', (err as Error).message);
    }
  }

  // Attempt 2: Local Service Account JSON file (via GOOGLE_APPLICATION_CREDENTIALS or auto-discovered service-account.json)
  const candidateKeyPaths = [
    env.GOOGLE_APPLICATION_CREDENTIALS,
    path.resolve(process.cwd(), 'service-account.json'),
    path.resolve(process.cwd(), '../service-account.json'),
    path.resolve(process.cwd(), '../../service-account.json')
  ].filter(Boolean) as string[];

  for (const keyPath of candidateKeyPaths) {
    const resolvedPath = path.isAbsolute(keyPath) ? keyPath : path.resolve(process.cwd(), keyPath);
    if (fs.existsSync(resolvedPath)) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(resolvedPath),
          projectId: env.FIREBASE_PROJECT_ID,
          storageBucket: env.FIREBASE_PROJECT_ID ? `${env.FIREBASE_PROJECT_ID}.appspot.com` : undefined
        });
        isFirebaseInitialized = true;
        setupFirestore();
        console.log(`Firebase Admin initialized with service account file: ${path.basename(resolvedPath)}`);
        return;
      } catch (err) {
        console.warn(`Failed to initialize Firebase from ${resolvedPath}:`, (err as Error).message);
      }
    }
  }

  // Attempt 3: Application Default Credentials in GCP environment (Cloud Run / App Engine / GCE)
  if (process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT || (env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(env.GOOGLE_APPLICATION_CREDENTIALS))) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
        storageBucket: env.FIREBASE_PROJECT_ID ? `${env.FIREBASE_PROJECT_ID}.appspot.com` : undefined
      });
      isFirebaseInitialized = true;
      setupFirestore();
      console.log('Firebase Admin initialized with Application Default Credentials.');
      return;
    } catch (err) {
      console.warn('Application Default Credentials initialization note:', (err as Error).message);
    }
  }

  // Production check: Fail clearly in production if Firebase is misconfigured. Never silently deploy an in-memory app.
  if (env.NODE_ENV === 'production' && (!isFirebaseInitialized || !firestoreDb)) {
    const diagnostic = getFirebaseDiagnostics();
    console.error('================================================================================');
    console.error('CRITICAL CONFIGURATION ERROR: FIRESTORE CREDENTIALS MISSING IN PRODUCTION');
    console.error('================================================================================');
    console.error('CivicResolve requires Google Cloud Firestore in production mode.');
    console.error('In-memory persistence is strictly forbidden in production.');
    console.error(`Missing configuration: ${diagnostic.missingConfig.join(', ') || 'No valid credentials found'}`);
    console.error('Cloud Run Deployment Guide:');
    diagnostic.recommendations.forEach((rec, idx) => console.error(`  ${idx + 1}. ${rec}`));
    console.error('================================================================================');
    throw new Error(
      'FATAL: Firebase credentials missing in production environment. In-memory store is forbidden in production.'
    );
  }

  console.log('Firebase credentials not detected. Operating with in-memory persistence store (Development/Testing only).');
}

export function getFirestore(): admin.firestore.Firestore | null {
  return firestoreDb;
}

export function getAuth(): admin.auth.Auth | null {
  return firebaseAuth;
}

export function isFirebaseReady(): boolean {
  return isFirebaseInitialized && firestoreDb !== null;
}

export function resetFirebaseClient(): void {
  isFirebaseInitialized = false;
  firestoreDb = null;
  firebaseAuth = null;
  firebaseBucket = null;
}

/**
 * Strips huge base64 data from reports and saves images to Firebase Storage or local reference.
 * Prevents Firestore document bloat and memory leaks.
 */
export async function saveReportImage(
  reportId: string,
  image?: ImageMetadata
): Promise<ImageMetadata | undefined> {
  if (!image) return undefined;
  if (!image.dataBase64) return image;

  const cleanBase64 = image.dataBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');
  const ext = image.mimeType === 'image/png' ? 'png' : image.mimeType === 'image/webp' ? 'webp' : 'jpg';

  if (isFirebaseReady() && firebaseBucket) {
    try {
      const filePath = `reports/${reportId}/image.${ext}`;
      const file = firebaseBucket.file(filePath);

      await file.save(buffer, {
        metadata: {
          contentType: image.mimeType || 'image/jpeg'
        }
      });

      return {
        url: `https://storage.googleapis.com/${firebaseBucket.name}/${filePath}`,
        mimeType: image.mimeType,
        fileSizeBytes: buffer.length,
        capturedAt: image.capturedAt || new Date().toISOString()
      };
    } catch (err) {
      console.warn('Firebase Storage upload failed, storing metadata reference:', (err as Error).message);
    }
  }

  // Local development / fallback reference (Base64 stripped from persisted database document)
  return {
    url: image.url || `local://reports/${reportId}/image.${ext}`,
    mimeType: image.mimeType,
    fileSizeBytes: buffer.length,
    capturedAt: image.capturedAt || new Date().toISOString()
  };
}

export interface ListIssuesOptions {
  limit?: number;
  offset?: number;
  category?: CivicIssueCategory;
  status?: CivicIssueStatus;
}

// Issue Repository supporting Firestore in production and In-Memory fallback in development
export const IssueRepository = {
  async list(options: ListIssuesOptions = {}): Promise<{ issues: CivicIssue[]; total: number }> {
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const offset = Math.max(0, options.offset || 0);

    if (env.NODE_ENV === 'production' && !isFirebaseReady()) {
      throw new Error('Firestore is required in production mode.');
    }

    if (isFirebaseReady() && firestoreDb) {
      let query: admin.firestore.Query = firestoreDb.collection('issues');

      if (options.category) {
        query = query.where('category', '==', options.category);
      }
      if (options.status) {
        query = query.where('status', '==', options.status);
      }

      query = query.orderBy('createdAt', 'desc');

      const countSnapshot = await query.count().get();
      const total = countSnapshot.data().count;

      const snapshot = await query.offset(offset).limit(limit).get();
      const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CivicIssue));

      return { issues, total };
    }

    // In-memory implementation for development
    let all = Array.from(inMemoryIssues.values());

    if (options.category) {
      all = all.filter(i => i.category === options.category);
    }
    if (options.status) {
      all = all.filter(i => i.status === options.status);
    }

    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = all.length;
    const issues = all.slice(offset, offset + limit);

    return { issues, total };
  },

  async getById(id: string): Promise<CivicIssue | null> {
    if (env.NODE_ENV === 'production' && !isFirebaseReady()) {
      throw new Error('Firestore is required in production mode.');
    }

    if (isFirebaseReady() && firestoreDb) {
      const doc = await firestoreDb.collection('issues').doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as CivicIssue;
    }

    return inMemoryIssues.get(id) || null;
  },

  async save(issue: CivicIssue): Promise<CivicIssue> {
    if (env.NODE_ENV === 'production' && !isFirebaseReady()) {
      throw new Error('Firestore is required in production mode.');
    }

    if (isFirebaseReady() && firestoreDb) {
      await firestoreDb.collection('issues').doc(issue.id).set(issue);
      return issue;
    }

    inMemoryIssues.set(issue.id, issue);
    return issue;
  },

  async update(id: string, updates: Partial<CivicIssue>): Promise<CivicIssue | null> {
    if (env.NODE_ENV === 'production' && !isFirebaseReady()) {
      throw new Error('Firestore is required in production mode.');
    }

    if (isFirebaseReady() && firestoreDb) {
      const docRef = firestoreDb.collection('issues').doc(id);
      const doc = await docRef.get();
      if (!doc.exists) return null;

      await docRef.set(updates, { merge: true });
      const updated = await docRef.get();
      return { id: updated.id, ...updated.data() } as CivicIssue;
    }

    const existing = inMemoryIssues.get(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    inMemoryIssues.set(id, merged);
    return merged;
  },

  /**
   * Atomically updates report fields AND appends an audit event in a single transaction.
   * Uses Firestore runTransaction in production to prevent race conditions or dropped audit events.
   */
  async atomicUpdateWithAudit(
    id: string,
    updates: Partial<CivicIssue>,
    auditEvent: ReportAuditEvent
  ): Promise<CivicIssue | null> {
    if (env.NODE_ENV === 'production' && !isFirebaseReady()) {
      throw new Error('Firestore is required in production mode.');
    }

    if (isFirebaseReady() && firestoreDb) {
      const docRef = firestoreDb.collection('issues').doc(id);
      return await firestoreDb.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) return null;

        const current = doc.data() as CivicIssue;
        const currentAudit = current.auditHistory || [];
        const mergedAudit = [...currentAudit, auditEvent];

        const finalUpdates = {
          ...updates,
          auditHistory: mergedAudit,
          updatedAt: new Date().toISOString()
        };

        transaction.update(docRef, finalUpdates);
        return { ...current, ...finalUpdates };
      });
    }

    // In-memory atomic update for development and testing
    const existing = inMemoryIssues.get(id);
    if (!existing) return null;

    const currentAudit = existing.auditHistory || [];
    const mergedAudit = [...currentAudit, auditEvent];

    const merged = {
      ...existing,
      ...updates,
      auditHistory: mergedAudit,
      updatedAt: new Date().toISOString()
    };
    inMemoryIssues.set(id, merged);
    return merged;
  },

  clear(): void {
    inMemoryIssues.clear();
  }
};
