import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import {
  IssueRepository,
  resetFirebaseClient,
  getFirebaseDiagnostics
} from '../src/services/firebase.js';
import {
  setGeminiClient,
  resetGeminiClient,
  type GeminiModelClient
} from '../src/services/gemini.js';
import {
  setAuthVerifierForTesting,
  resetAuthVerifier
} from '../src/middleware/auth.js';
import { env } from '../src/config/env.js';
import type { FastifyInstance } from 'fastify';

function createMockGenAIClient(jsonResponse: object): GeminiModelClient {
  return {
    models: {
      async generateContent(_params: any) {
        return {
          text: JSON.stringify(jsonResponse)
        };
      }
    }
  };
}

const standardMockTriage = {
  category: 'street_lighting',
  severity: 'medium',
  summary: 'Streetlight outage along pedestrian walkway',
  safetyRisk: 'moderate',
  publicImpact: 'neighborhood',
  recommendedDepartmentId: 'dept_electrical',
  recommendedDepartment: 'Department of Electrical Services',
  confidence: 0.91,
  reasoning: 'Reduced visibility for pedestrians at night.',
  suggestedActionItems: ['Replace luminaire']
};

describe('CivicResolve Phase 2 Step 4.1: Backend Security and Persistence Hardening', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    IssueRepository.clear();
    resetGeminiClient();
    resetAuthVerifier();

    setGeminiClient(createMockGenAIClient(standardMockTriage));

    // Configure test token verifier: simulates Firebase Auth token decoding
    setAuthVerifierForTesting(async (token: string) => {
      if (token === 'admin-jwt-valid') {
        return { uid: 'admin-user-001', email: 'supervisor@citygov.org', role: 'admin' };
      }
      if (token === 'citizen-jwt-valid') {
        return { uid: 'citizen-user-002', email: 'citizen@example.org', role: 'citizen' as any };
      }
      return null;
    });

    app = buildApp();
  });

  afterEach(async () => {
    IssueRepository.clear();
    resetGeminiClient();
    resetAuthVerifier();
    await app.close();
  });

  // ==========================================================================
  // 1. Report Identifiers (UUIDv4)
  // ==========================================================================

  it('generates collision-resistant UUIDv4 report identifiers', async () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const generatedIds: string[] = [];

    for (let i = 0; i < 5; i++) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/issues',
        payload: {
          title: `Report number ${i + 1} for road repair`,
          description: `Detailed description for report ${i + 1} regarding surface damage.`,
          category: 'pothole',
          location: { address: `${100 + i} Main Street` }
        }
      });

      assert.equal(response.statusCode, 201);
      const json = response.json();
      assert.match(json.data.id, uuidRegex);
      generatedIds.push(json.data.id);
    }

    // Ensure all 5 generated IDs are mutually unique
    const uniqueIds = new Set(generatedIds);
    assert.equal(uniqueIds.size, 5);
  });

  // ==========================================================================
  // 2. API Privacy: Strict Public vs Administrative Serialization
  // ==========================================================================

  it('strictly omits reporter personal contact details and coarsens GPS in public responses', async () => {
    const payload = {
      title: 'Water main leak near library',
      description: 'Clean drinking water is bubbling through sidewalk cracks continuously.',
      category: 'water_supply',
      location: {
        address: '450 Public Square',
        neighborhood: 'Civic Center',
        latitude: 37.7749295, // High precision GPS
        longitude: -122.4194155,
        contextZone: 'commercial_high_density'
      },
      reporterName: 'Jane Private',
      reporterEmail: 'jane.private@example.org',
      reporterPhone: '+1-555-019-2834'
    };

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/issues',
      payload
    });

    assert.equal(createRes.statusCode, 201);
    const created = createRes.json().data;

    // 1. Verify Public Submission Response
    assert.equal(created.reporterEmail, undefined);
    assert.equal(created.reporterPhone, undefined);
    // Coarsened coordinates: ~100m (3 decimal places)
    assert.equal(created.location.latitude, 37.775);
    assert.equal(created.location.longitude, -122.419);

    // 2. Verify Public GET /api/issues/:id
    const publicGetRes = await app.inject({
      method: 'GET',
      url: `/api/issues/${created.id}`
    });
    assert.equal(publicGetRes.statusCode, 200);
    const publicData = publicGetRes.json().data;
    assert.equal(publicData.reporterEmail, undefined);
    assert.equal(publicData.reporterPhone, undefined);
    assert.equal(publicData.location.latitude, 37.775);
    assert.equal(publicData.location.longitude, -122.419);

    // 3. Verify Administrative GET /api/admin/issues/:id (authorized)
    const adminGetRes = await app.inject({
      method: 'GET',
      url: `/api/admin/issues/${created.id}`,
      headers: { authorization: 'Bearer admin-jwt-valid' }
    });
    assert.equal(adminGetRes.statusCode, 200);
    const adminData = adminGetRes.json().data;
    // Unredacted personal information preserved for municipal field staff
    assert.equal(adminData.reporterEmail, 'jane.private@example.org');
    assert.equal(adminData.reporterPhone, '+1-555-019-2834');
    assert.equal(adminData.reporterName, 'Jane Private');
    // Exact GPS retained for repair crew navigation
    assert.equal(adminData.location.latitude, 37.7749295);
    assert.equal(adminData.location.longitude, -122.4194155);
    // Audit history accessible to administrator
    assert.ok(Array.isArray(adminData.auditHistory));
    assert.ok(adminData.auditHistory.length >= 3);
  });

  // ==========================================================================
  // 3. Administrative Authorization & Role Verification
  // ==========================================================================

  it('rejects unauthenticated requests to administrative endpoints (HTTP 401)', async () => {
    // 1. GET /api/admin/issues without token
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/admin/issues'
    });
    assert.equal(listRes.statusCode, 401);
    assert.equal(listRes.json().success, false);
    assert.match(listRes.json().message, /Bearer token required/i);

    // 2. GET /api/admin/issues/:id without token
    const getRes = await app.inject({
      method: 'GET',
      url: '/api/admin/issues/some-id'
    });
    assert.equal(getRes.statusCode, 401);

    // 3. PATCH /api/admin/issues/:id without token
    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/api/admin/issues/some-id',
      payload: { status: 'in_progress' }
    });
    assert.equal(patchRes.statusCode, 401);
  });

  it('rejects administrative requests with invalid or non-admin credentials (HTTP 401 & 403)', async () => {
    // 1. Invalid token -> 401
    const invalidTokenRes = await app.inject({
      method: 'GET',
      url: '/api/admin/issues',
      headers: { authorization: 'Bearer invalid-token-xyz' }
    });
    assert.equal(invalidTokenRes.statusCode, 401);

    // 2. Authenticated user without admin role -> 403 Forbidden
    const nonAdminRes = await app.inject({
      method: 'GET',
      url: '/api/admin/issues',
      headers: { authorization: 'Bearer citizen-jwt-valid' }
    });
    assert.equal(nonAdminRes.statusCode, 403);
    assert.equal(nonAdminRes.json().success, false);
    assert.match(nonAdminRes.json().message, /lacks municipal administrative privileges/i);

    // 3. Forged client headers (e.g. X-Admin) are never trusted
    const forgedHeaderRes = await app.inject({
      method: 'GET',
      url: '/api/admin/issues',
      headers: {
        'x-admin': 'true',
        'x-role': 'admin'
      }
    });
    assert.equal(forgedHeaderRes.statusCode, 401);
  });

  // ==========================================================================
  // 4. Gemini Test Endpoint Protection
  // ==========================================================================

  it('protects POST /api/triage/test from unauthorized quota consumption (HTTP 401 & 403)', async () => {
    const payload = {
      title: 'Dark streetlight outage test',
      description: 'Testing triage execution without persisting records.',
      category: 'street_lighting',
      location: { address: '12 Test Lane' }
    };

    // 1. Unauthenticated request -> 401
    const unauthRes = await app.inject({
      method: 'POST',
      url: '/api/triage/test',
      payload
    });
    assert.equal(unauthRes.statusCode, 401);

    // 2. Non-admin user -> 403
    const citizenRes = await app.inject({
      method: 'POST',
      url: '/api/triage/test',
      headers: { authorization: 'Bearer citizen-jwt-valid' },
      payload
    });
    assert.equal(citizenRes.statusCode, 403);

    // 3. Authorized admin -> 200 OK
    const adminRes = await app.inject({
      method: 'POST',
      url: '/api/triage/test',
      headers: { authorization: 'Bearer admin-jwt-valid' },
      payload
    });
    assert.equal(adminRes.statusCode, 200);
    const json = adminRes.json();
    assert.equal(json.success, true);
    assert.ok(json.data.triage);
    assert.ok(json.data.priority);
  });

  // ==========================================================================
  // 5. Append-Only Audit History
  // ==========================================================================

  it('maintains append-only audit event history and tracks administrative status updates', async () => {
    // 1. Submit citizen report
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/issues',
      payload: {
        title: 'Clogged storm drain on Market St',
        description: 'Water accumulation on curb due to heavy leaves and debris.',
        category: 'water_supply',
        location: { address: '200 Market St' },
        reporterName: 'Resident Mark',
        reporterEmail: 'mark@example.org'
      }
    });
    assert.equal(createRes.statusCode, 201);
    const reportId = createRes.json().data.id;

    // Check initial audit trail
    const stored = await IssueRepository.getById(reportId);
    assert.ok(stored);
    assert.ok(stored.auditHistory);
    assert.ok(stored.auditHistory.length >= 3);

    const eventTypes = stored.auditHistory.map(e => e.eventType);
    assert.ok(eventTypes.includes('report_submitted'));
    assert.ok(eventTypes.includes('triage_completed'));
    assert.ok(eventTypes.includes('priority_calculated'));

    // Check submit event properties
    const submitEvent = stored.auditHistory.find(e => e.eventType === 'report_submitted');
    assert.ok(submitEvent);
    assert.equal(submitEvent.actor.type, 'citizen');
    assert.ok(submitEvent.timestamp);
    assert.ok(submitEvent.id);

    // 2. Admin status update via PATCH /api/admin/issues/:id
    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/api/admin/issues/${reportId}`,
      headers: { authorization: 'Bearer admin-jwt-valid' },
      payload: {
        status: 'in_progress',
        notes: 'Maintenance crew dispatched with pump vehicle.'
      }
    });
    assert.equal(patchRes.statusCode, 200);
    const patchJson = patchRes.json();
    assert.equal(patchJson.success, true);
    assert.equal(patchJson.data.status, 'in_progress');

    // 3. Verify that the new event was appended without modifying existing events
    const updated = await IssueRepository.getById(reportId);
    assert.ok(updated);
    assert.equal(updated.status, 'in_progress');
    assert.equal(updated.auditHistory.length, stored.auditHistory.length + 1);

    const latestEvent = updated.auditHistory[updated.auditHistory.length - 1];
    assert.equal(latestEvent.eventType, 'status_updated');
    assert.equal(latestEvent.actor.type, 'admin');
    assert.equal(latestEvent.actor.id, 'admin-user-001');
    assert.match(latestEvent.description, /status changed from triaged to in_progress/i);
    assert.match(latestEvent.description, /Maintenance crew dispatched/i);
  });

  // ==========================================================================
  // 6. Firestore Production Diagnostics & Startup Safeguards
  // ==========================================================================

  it('provides structured startup diagnostics and strictly forbids in-memory fallback in production', async () => {
    // 1. Diagnostics inspection
    const diagnostics = getFirebaseDiagnostics();
    assert.ok(typeof diagnostics.isReady === 'boolean');
    assert.ok(typeof diagnostics.persistenceMode === 'string');
    assert.ok(Array.isArray(diagnostics.missingConfig));
    assert.ok(Array.isArray(diagnostics.recommendations));

    // 2. Production fail-fast guard
    const originalEnv = env.NODE_ENV;
    try {
      (env as any).NODE_ENV = 'production';
      resetFirebaseClient();

      // Repository operations MUST throw in production if Firebase is uninitialized
      await assert.rejects(
        async () => {
          await IssueRepository.list();
        },
        /Firestore is required in production mode/
      );

      await assert.rejects(
        async () => {
          await IssueRepository.save({
            id: 'uuid-fail-prod',
            title: 'Test',
            description: 'Test description',
            category: 'other',
            status: 'submitted',
            urgency: 'low',
            location: { address: 'Test' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        },
        /Firestore is required in production mode/
      );
    } finally {
      (env as any).NODE_ENV = originalEnv;
    }
  });
});
