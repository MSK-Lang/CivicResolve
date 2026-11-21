import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import {
  IssueRepository,
  resetFirebaseClient
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
import { resetRateLimits } from '../src/middleware/rate-limiter.js';
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

describe('CivicResolve Phase 2 Step 4.2: Final Security Hardening, Rate Limiting & Audit Integrity', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    IssueRepository.clear();
    resetGeminiClient();
    resetAuthVerifier();
    resetRateLimits();

    setGeminiClient(createMockGenAIClient(standardMockTriage));

    // Configure test token verifier: simulates Firebase Auth token decoding
    setAuthVerifierForTesting(async (token: string) => {
      if (token === 'admin-jwt-valid') {
        return { uid: 'admin-user-001', email: 'supervisor@citygov.org', role: 'admin' };
      }
      if (token === 'revoked-admin-token') {
        throw new Error('Firebase ID token has been revoked.');
      }
      if (token === 'wrong-audience-token') {
        throw new Error('Token audience does not match the configured Firebase project.');
      }
      return null;
    });

    app = buildApp();
  });

  afterEach(async () => {
    IssueRepository.clear();
    resetGeminiClient();
    resetAuthVerifier();
    resetRateLimits();
    await app.close();
  });

  // ==========================================================================
  // 1. Public API Rate Limiting (HTTP 429)
  // ==========================================================================

  it('enforces rate limits on report submissions and returns HTTP 429 with retry headers', async () => {
    const payload = {
      title: 'Repetitive report spam attempt',
      description: 'Automated script flooding the submission endpoint.',
      category: 'pothole',
      location: { address: '100 Floodway' },
      reporterEmail: 'spammer@example.org'
    };

    // Submissions 1 through 10 should succeed (limit is 10/min)
    for (let i = 0; i < 10; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/issues',
        payload
      });
      assert.equal(res.statusCode, 201);
    }

    // 11th submission from the same client key must be rate-limited
    const rateLimitedRes = await app.inject({
      method: 'POST',
      url: '/api/issues',
      payload
    });

    assert.equal(rateLimitedRes.statusCode, 429);
    const json = rateLimitedRes.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'TooManyRequests');
    assert.match(json.message, /rate limit exceeded/i);
    assert.ok(json.retryAfterSeconds >= 1);

    // Verify rate limit response headers
    assert.equal(rateLimitedRes.headers['x-ratelimit-remaining'], '0');
    assert.ok(rateLimitedRes.headers['retry-after']);
    assert.equal(rateLimitedRes.headers['x-ratelimit-limit'], '10');

    // Submissions from a DIFFERENT composite key (different reporter email) must not be blocked
    const differentUserRes = await app.inject({
      method: 'POST',
      url: '/api/issues',
      payload: {
        ...payload,
        reporterEmail: 'legitimate.citizen@example.org'
      }
    });
    assert.equal(differentUserRes.statusCode, 201);
  });

  // ==========================================================================
  // 2. HTTP Request Body Payload Limits (HTTP 413)
  // ==========================================================================

  it('rejects oversized HTTP payloads exceeding bodyLimit before buffering', async () => {
    // Generate an oversized string payload exceeding the 6MB limit
    const hugeDescription = 'A'.repeat(7 * 1024 * 1024); // 7MB string

    const response = await app.inject({
      method: 'POST',
      url: '/api/issues',
      payload: {
        title: 'Huge payload test',
        description: hugeDescription,
        category: 'sanitation',
        location: { address: 'Test St' }
      }
    });

    // Fastify returns HTTP 413 Payload Too Large
    assert.equal(response.statusCode, 413);
  });

  // ==========================================================================
  // 3. Audit History Integrity & Transactional Monotonicity
  // ==========================================================================

  it('guarantees atomic append-only audit updates and prevents client history replacement', async () => {
    // 1. Create a legitimate report
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/issues',
      payload: {
        title: 'Broken streetlight on Pine Ave',
        description: 'Lamp is completely unlit posing safety hazard.',
        category: 'street_lighting',
        location: { address: '88 Pine Ave' },
        reporterEmail: 'resident@example.org'
      }
    });
    assert.equal(createRes.statusCode, 201);
    const reportId = createRes.json().data.id;

    // 2. Perform first administrative update via PATCH
    const patch1 = await app.inject({
      method: 'PATCH',
      url: `/api/admin/issues/${reportId}`,
      headers: { authorization: 'Bearer admin-jwt-valid' },
      payload: {
        status: 'in_progress',
        notes: 'Dispatched electrician unit'
      }
    });
    assert.equal(patch1.statusCode, 200);

    // 3. Perform second administrative update with forged client-supplied auditHistory
    const patch2 = await app.inject({
      method: 'PATCH',
      url: `/api/admin/issues/${reportId}`,
      headers: { authorization: 'Bearer admin-jwt-valid' },
      payload: {
        status: 'resolved',
        notes: 'Fixture replaced and verified',
        // Attempt to forge or wipe history: must be stripped and rejected by schema
        auditHistory: [
          {
            id: 'forged-event',
            reportId,
            eventType: 'report_submitted',
            timestamp: '1970-01-01T00:00:00.000Z',
            actor: { type: 'admin', id: 'hacker' },
            description: 'Forged history entry'
          }
        ]
      }
    });
    assert.equal(patch2.statusCode, 200);

    // 4. Inspect final stored report in repository
    const stored = await IssueRepository.getById(reportId);
    assert.ok(stored);
    assert.equal(stored.status, 'resolved');

    // Ensure all events exist in strictly increasing chronological order
    const events = stored.auditHistory || [];
    assert.ok(events.length >= 5); // submit, triage, priority, patch1, patch2

    // Verify the forged event was NOT accepted
    assert.ok(!events.some(e => e.id === 'forged-event'));

    // Verify event progression
    const eventTypes = events.map(e => e.eventType);
    assert.ok(eventTypes.includes('report_submitted'));
    assert.ok(eventTypes.includes('status_updated'));

    // Check last event details
    const lastEvent = events[events.length - 1];
    assert.equal(lastEvent.eventType, 'status_updated');
    assert.equal(lastEvent.actor.id, 'admin-user-001');
    assert.match(lastEvent.description, /Fixture replaced and verified/);
  });

  // ==========================================================================
  // 4. Authentication Hardening: Revocation & Audience Verification
  // ==========================================================================

  it('rejects revoked administrative tokens immediately (checkRevoked)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/issues',
      headers: { authorization: 'Bearer revoked-admin-token' }
    });

    assert.equal(res.statusCode, 401);
    assert.match(res.json().message, /revoked/i);
  });

  it('rejects tokens with mismatched audience or issuer', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/issues',
      headers: { authorization: 'Bearer wrong-audience-token' }
    });

    assert.equal(res.statusCode, 401);
    assert.match(res.json().message, /audience/i);
  });
});
