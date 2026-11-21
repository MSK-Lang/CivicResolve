import admin from 'firebase-admin';
import { env } from '../config/env.js';
import type { CivicIssue } from '@civicresolve/shared';

let isFirebaseInitialized = false;
let firestoreDb: admin.firestore.Firestore | null = null;
let firebaseAuth: admin.auth.Auth | null = null;

// In-memory fallback repository when Firebase credentials are not yet configured
const inMemoryIssues = new Map<string, CivicIssue>();

export function initFirebase() {
  if (admin.apps.length > 0) {
    isFirebaseInitialized = true;
    firestoreDb = admin.firestore();
    firebaseAuth = admin.auth();
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
        })
      });
      isFirebaseInitialized = true;
      firestoreDb = admin.firestore();
      firebaseAuth = admin.auth();
      console.log('Firebase Admin initialized with explicit service account credentials.');
      return;
    } catch (err) {
      console.warn('Failed to initialize Firebase with explicit service account:', err);
    }
  }

  // Attempt 2: Application Default Credentials (e.g. running inside Cloud Run or with GOOGLE_APPLICATION_CREDENTIALS)
  if (env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE || env.FIREBASE_PROJECT_ID) {
    try {
      admin.initializeApp({
        projectId: env.FIREBASE_PROJECT_ID
      });
      isFirebaseInitialized = true;
      firestoreDb = admin.firestore();
      firebaseAuth = admin.auth();
      console.log('Firebase Admin initialized with Application Default Credentials.');
      return;
    } catch (err) {
      console.warn('Application Default Credentials initialization note:', (err as Error).message);
    }
  }

  console.log('Firebase credentials not detected. Operating with in-memory persistence store.');
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

// Issue Repository supporting both Firestore and In-Memory fallback
export const IssueRepository = {
  async list(): Promise<CivicIssue[]> {
    if (isFirebaseReady() && firestoreDb) {
      const snapshot = await firestoreDb.collection('issues').orderBy('createdAt', 'desc').limit(50).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CivicIssue));
    }
    return Array.from(inMemoryIssues.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getById(id: string): Promise<CivicIssue | null> {
    if (isFirebaseReady() && firestoreDb) {
      const doc = await firestoreDb.collection('issues').doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as CivicIssue;
    }
    return inMemoryIssues.get(id) || null;
  },

  async save(issue: CivicIssue): Promise<CivicIssue> {
    if (isFirebaseReady() && firestoreDb) {
      await firestoreDb.collection('issues').doc(issue.id).set(issue);
      return issue;
    }
    inMemoryIssues.set(issue.id, issue);
    return issue;
  }
};
