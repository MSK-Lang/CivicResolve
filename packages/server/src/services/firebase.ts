import admin from 'firebase-admin';
import { env } from '../config/env.js';
import type { CivicIssue, ImageMetadata, CivicIssueCategory, CivicIssueStatus } from '@civicresolve/shared';

let isFirebaseInitialized = false;
let firestoreDb: admin.firestore.Firestore | null = null;
let firebaseAuth: admin.auth.Auth | null = null;
let firebaseBucket: any = null;

// In-memory fallback repository strictly for local development and testing
const inMemoryIssues = new Map<string, CivicIssue>();

export function initFirebase(): void {
  if (admin.apps.length > 0) {
    isFirebaseInitialized = true;
    firestoreDb = admin.firestore();
    firebaseAuth = admin.auth();
    try {
      firebaseBucket = admin.storage().bucket();
    } catch {
      firebaseBucket = null;
    }
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
      firestoreDb = admin.firestore();
      firebaseAuth = admin.auth();
      try {
        firebaseBucket = admin.storage().bucket();
      } catch {
        firebaseBucket = null;
      }
      console.log('Firebase Admin initialized with explicit service account credentials.');
      return;
    } catch (err) {
      console.warn('Failed to initialize Firebase with explicit service account:', (err as Error).message);
    }
  }

  // Attempt 2: Application Default Credentials (e.g. running inside Cloud Run or with GOOGLE_APPLICATION_CREDENTIALS)
  if (env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE || env.FIREBASE_PROJECT_ID) {
    try {
      admin.initializeApp({
        projectId: env.FIREBASE_PROJECT_ID,
        storageBucket: env.FIREBASE_PROJECT_ID ? `${env.FIREBASE_PROJECT_ID}.appspot.com` : undefined
      });
      isFirebaseInitialized = true;
      firestoreDb = admin.firestore();
      firebaseAuth = admin.auth();
      try {
        firebaseBucket = admin.storage().bucket();
      } catch {
        firebaseBucket = null;
      }
      console.log('Firebase Admin initialized with Application Default Credentials.');
      return;
    } catch (err) {
      console.warn('Application Default Credentials initialization note:', (err as Error).message);
    }
  }

  // Production check: Fail clearly in production if Firebase is misconfigured. Never silently deploy an in-memory app.
  if (env.NODE_ENV === 'production') {
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

  clear(): void {
    inMemoryIssues.clear();
  }
};
