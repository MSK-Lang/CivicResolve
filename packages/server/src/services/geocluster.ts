import { calculateHaversineDistanceMeters } from '../utils/haversine.js';
import { IssueRepository, getFirestore, isFirebaseReady } from './firebase.js';
import type { CivicIssue, DuplicateCandidate } from '@civicresolve/shared';

export const GEO_CLUSTER_RADIUS_METERS = 500;

export type { DuplicateCandidate };

// In-memory cluster store fallback for development
const inMemoryClusters = new Map<string, DuplicateCandidate>();

export async function detectGeoClusters(): Promise<DuplicateCandidate[]> {
  const { issues } = await IssueRepository.list({ limit: 100 });
  const candidates: DuplicateCandidate[] = [];

  // Fetch existing decisions from Firestore or memory
  const existingDecisions = new Map<string, { status: 'pending' | 'approved' | 'rejected'; reviewedBy?: string; reviewedAt?: string; notes?: string }>();
  if (isFirebaseReady() && getFirestore()) {
    try {
      const snap = await getFirestore()!.collection('clusters').limit(100).get();
      snap.docs.forEach((doc) => {
        const d = doc.data();
        existingDecisions.set(doc.id, {
          status: d.status,
          reviewedBy: d.reviewedBy,
          reviewedAt: d.reviewedAt,
          notes: d.notes,
        });
      });
    } catch (e) {
      console.warn('Failed to load clusters from Firestore:', (e as Error).message);
    }
  } else {
    inMemoryClusters.forEach((val, key) => {
      existingDecisions.set(key, {
        status: val.status,
        reviewedBy: val.reviewedBy,
        reviewedAt: val.reviewedAt,
        notes: val.notes,
      });
    });
  }

  // Group issues by category to eliminate cross-category comparisons (partitions search space)
  const categoryBuckets = new Map<string, CivicIssue[]>();
  for (const issue of issues) {
    if (typeof issue.location.latitude !== 'number' || typeof issue.location.longitude !== 'number') {
      continue;
    }
    const list = categoryBuckets.get(issue.category) || [];
    list.push(issue);
    categoryBuckets.set(issue.category, list);
  }

  // Spatial bounding-box thresholds for 500 meters (~0.0045 deg lat, ~0.007 deg lon)
  const MAX_LAT_DIFF = 0.005;
  const MAX_LON_DIFF = 0.008;

  for (const categoryIssues of categoryBuckets.values()) {
    const count = categoryIssues.length;
    for (let i = 0; i < count; i++) {
      const a = categoryIssues[i];
      const aLat = a.location.latitude!;
      const aLon = a.location.longitude!;

      for (let j = i + 1; j < count; j++) {
        const b = categoryIssues[j];
        const bLat = b.location.latitude!;
        const bLon = b.location.longitude!;

        // Fast bounding-box pre-filter: skip expensive Haversine trigonometric calls
        if (Math.abs(aLat - bLat) > MAX_LAT_DIFF || Math.abs(aLon - bLon) > MAX_LON_DIFF) {
          continue;
        }

        const distance = calculateHaversineDistanceMeters(
          { latitude: aLat, longitude: aLon },
          { latitude: bLat, longitude: bLon }
        );

        if (distance <= GEO_CLUSTER_RADIUS_METERS) {
          // Deterministic cluster ID based on sorted report UUIDs
          const pairId = [a.id, b.id].sort().join('_cluster_');
          const decision = existingDecisions.get(pairId);

          const candidate: DuplicateCandidate = {
            id: pairId,
            primaryReport: {
              id: a.id,
              title: a.title,
              category: a.category,
              address: a.location.address,
              createdAt: a.createdAt,
              status: a.status,
            },
            duplicateReport: {
              id: b.id,
              title: b.title,
              category: b.category,
              address: b.location.address,
              createdAt: b.createdAt,
              status: b.status,
            },
            distanceMeters: Math.round(distance),
            category: a.category,
            status: decision?.status || 'pending',
            reviewedBy: decision?.reviewedBy,
            reviewedAt: decision?.reviewedAt,
            notes: decision?.notes,
          };

          candidates.push(candidate);
        }
      }
    }
  }

  return candidates;
}

export async function recordClusterDecision(params: {
  clusterId: string;
  decision: 'approved' | 'rejected';
  reviewer: string;
  notes?: string;
}): Promise<DuplicateCandidate | null> {
  const now = new Date().toISOString();
  const decisionRecord = {
    clusterId: params.clusterId,
    status: params.decision,
    reviewedBy: params.reviewer,
    reviewedAt: now,
    notes: params.notes || undefined,
  };

  // Persist in Firestore
  if (isFirebaseReady() && getFirestore()) {
    await getFirestore()!.collection('clusters').doc(params.clusterId).set(decisionRecord, { merge: true });
  }

  // Update in-memory
  const existing = inMemoryClusters.get(params.clusterId);
  if (existing) {
    existing.status = params.decision;
    existing.reviewedBy = params.reviewer;
    existing.reviewedAt = now;
    existing.notes = params.notes;
  }

  const all = await detectGeoClusters();
  return all.find((c) => c.id === params.clusterId) || null;
}
