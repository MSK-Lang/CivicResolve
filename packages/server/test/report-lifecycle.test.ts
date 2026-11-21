import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { IssueRepository, saveReportImage, resetFirebaseClient } from '../src/services/firebase.js';
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

// Mock Gemini client helper
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

function createFailingMockClient(message: string): GeminiModelClient {
  return {
    models: {
      async generateContent(_params: any) {
        throw new Error(message);
      }
    }
  };
}

describe('CivicResolve Phase 2 Step 4: Backend Report Pipeline Lifecycle', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    IssueRepository.clear();
    resetGeminiClient();
    resetAuthVerifier();
    setAuthVerifierForTesting(async (token) => {
      if (token === 'admin-test-token') {
        return { uid: 'admin-tester', email: 'admin@citygov.org', role: 'admin' };
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

  it('successfully creates report, persists initial record, runs Gemini triage and computes priority', async () => {
    const mockTriage = {
      category: 'pothole',
      severity: 'high',
      summary: 'Deep pothole blocking traffic lane on 5th Ave',
      safetyRisk: 'severe',
      publicImpact: 'arterial_road',
      recommendedDepartmentId: 'dept_transportation',
      recommendedDepartment: 'Department of Transportation',
      confidence: 0.94,
      reasoning: 'Severe structural road damage presenting immediate tire and vehicle suspension hazards.',
      suggestedActionItems: ['Dispatch road maintenance crew', 'Erect temporary hazard cone']
    };

    setGeminiClient(createMockGenAIClient(mockTriage));

    const payload = {
      title: 'Deep road crater on 5th Ave',
      description: 'A 6-inch deep pothole appeared after recent rainfall near the bus stop.',
      category: 'pothole',
      location: {
        address: '5th Ave & 42nd St',
        neighborhood: 'Midtown',
        latitude: 40.753123,
        longitude: -73.982456,
        contextZone: 'major_transit_corridor'
      },
      reporterName: 'Alex Citizen',
      reporterEmail: 'alex.citizen@example.org'
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/issues',
      payload
    });

    assert.equal(response.statusCode, 201);
    const json = response.json();
    assert.equal(json.success, true);
    // Collision-resistant UUID
    assert.match(json.data.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(json.data.status, 'triaged');
    assert.equal(json.data.urgency, 'high');
    assert.equal(json.data.category, 'pothole');

    // Priority Engine verification:
    // Severity High (25) + Safety Severe (22) + Impact Arterial (15) + Transit Corridor (10) = 72
    assert.ok(json.data.priorityScore);
    assert.equal(json.data.priorityScore.totalScore, 72);
    assert.equal(json.data.priorityScore.priorityLevel, 'P2_HIGH');
    assert.equal(json.data.priorityScore.slaHours, 24);

    // Public Privacy verification: citizen email is strictly omitted in public response
    assert.equal(json.data.reporterEmail, undefined);
    assert.equal(json.data.reporterPhone, undefined);

    // Coarsened GPS in public response
    assert.equal(json.data.location.latitude, 40.753);
    assert.equal(json.data.location.longitude, -73.982);

    // Verify stored entity in repository has unredacted data and audit trail
    const stored = await IssueRepository.getById(json.data.id);
    assert.ok(stored);
    assert.equal(stored.id, json.data.id);
    assert.equal(stored.status, 'triaged');
    assert.equal(stored.reporterEmail, 'alex.citizen@example.org');
    assert.equal(stored.aiTriage?.triageSource, 'gemini');
    assert.equal(stored.aiTriage?.aiConfidence, 0.94);
    assert.ok(Array.isArray(stored.auditHistory));
    assert.ok(stored.auditHistory.length >= 3);
  });

  it('strips large base64 image data before repository persistence while preserving image metadata', async () => {
    const mockTriage = {
      category: 'sanitation',
      severity: 'medium',
      summary: 'Overflowing municipal trash receptacle',
      safetyRisk: 'moderate',
      publicImpact: 'neighborhood',
      recommendedDepartment: 'dept_sanitation',
      recommendedDepartmentName: 'Department of Sanitation',
      confidence: 0.88,
      reasoning: 'Visible waste spillover on public pedestrian sidewalk.',
      suggestedActionItems: ['Dispatch collection truck']
    };

    setGeminiClient(createMockGenAIClient(mockTriage));

    const rawBase64 = 'data:image/jpeg;base64,' + Buffer.from('simulated-jpeg-data').toString('base64');

    const payload = {
      title: 'Overflowing trash bin on Elm Street',
      description: 'Public bin is completely full and spilling onto the curb.',
      category: 'sanitation',
      location: {
        address: '123 Elm Street',
        neighborhood: 'Downtown',
        latitude: 37.7749,
        longitude: -122.4194,
        contextZone: 'standard_residential'
      },
      image: {
        mimeType: 'image/jpeg',
        dataBase64: rawBase64,
        fileSizeBytes: 1024
      }
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/issues',
      payload
    });

    assert.equal(response.statusCode, 201);
    const json = response.json();
    assert.equal(json.success, true);

    // Verify stored entity in repository has base64 data stripped
    const stored = await IssueRepository.getById(json.data.id);
    assert.ok(stored);
    assert.ok(stored.image);
    assert.equal(stored.image.mimeType, 'image/jpeg');
    assert.equal(stored.image.dataBase64, undefined);
    assert.ok(stored.image.url);
    assert.ok(stored.imageUrl);
  });

  it('rejects report submission when required fields are missing or invalid (HTTP 400)', async () => {
    // Missing description and invalid latitude
    const payload = {
      title: 'Broken lamp',
      category: 'street_lighting',
      location: {
        address: 'Oak St',
        latitude: 999 // Invalid: must be between -90 and 90
      }
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/issues',
      payload
    });

    assert.equal(response.statusCode, 400);
    const json = response.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'Bad Request');
    assert.ok(Array.isArray(json.details));
  });

  it('rejects report submission with unsupported image MIME type (HTTP 400)', async () => {
    const payload = {
      title: 'Water leak',
      description: 'Water spraying from hydrant',
      category: 'water_supply',
      location: {
        address: '10 Main St'
      },
      image: {
        mimeType: 'image/gif', // Unsupported: only JPEG, PNG, WebP
        dataBase64: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      }
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/issues',
      payload
    });

    assert.equal(response.statusCode, 400);
    const json = response.json();
    assert.equal(json.success, false);
    assert.ok(json.details.some((d: any) => d.field === 'image.mimeType'));
  });

  it('rejects report submission with oversized image > 5MB (HTTP 400)', async () => {
    const payload = {
      title: 'Fallen tree branch',
      description: 'Branch on power line',
      category: 'public_safety',
      location: {
        address: '44 Pine Rd'
      },
      image: {
        mimeType: 'image/jpeg',
        fileSizeBytes: 6 * 1024 * 1024 // 6MB exceeds 5MB limit
      }
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/issues',
      payload
    });

    assert.equal(response.statusCode, 400);
    const json = response.json();
    assert.equal(json.success, false);
    assert.match(json.message, /exceeds the 5MB upload limit/i);
  });

  it('guarantees report persistence and falls back gracefully when Gemini provider fails', async () => {
    // Simulate AI timeout, network disconnect or 500 error
    setGeminiClient(createFailingMockClient('Google Gemini 503 Service Unavailable'));

    const payload = {
      title: 'Broken traffic signal at junction',
      description: 'Traffic light is stuck on red in all directions creating gridlock.',
      category: 'traffic_signals',
      location: {
        address: 'Broadway & 7th Ave',
        neighborhood: 'Times Square',
        latitude: 40.758,
        longitude: -73.985,
        contextZone: 'commercial_high_density'
      },
      reporterName: 'Traffic Warden',
      reporterEmail: 'warden@citygov.org'
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/issues',
      payload
    });

    // Report is NEVER lost because of an AI outage
    assert.equal(response.statusCode, 201);
    const json = response.json();
    assert.equal(json.success, true);
    assert.ok(json.data.id);

    // Fallback status and flags
    assert.equal(json.data.status, 'needs_review');
    assert.equal(json.data.aiTriage.triageSource, 'rules_fallback');
    assert.equal(json.data.aiTriage.aiConfidence, null);
    assert.equal(json.data.aiTriage.reviewRequired, true);
    assert.equal(json.data.aiTriage.assignedDepartmentId, 'dept_transportation');

    // Priority Engine still produces transparent score based on deterministic fallback
    assert.ok(json.data.priorityScore);
    assert.ok(json.data.priorityScore.totalScore >= 0);
    assert.ok(json.data.priorityScore.priorityLevel);

    // Confirm stored in database
    const stored = await IssueRepository.getById(json.data.id);
    assert.ok(stored);
    assert.equal(stored.status, 'needs_review');
  });

  it('GET /api/issues/:id returns single issue and masks reporter email', async () => {
    const initialReport = await IssueRepository.save({
      id: 'rep-test-001',
      title: 'Water main burst',
      description: 'Flooding intersection',
      category: 'water_supply',
      status: 'submitted',
      urgency: 'high',
      location: { address: '1st & Pine' },
      reporterName: 'John Public',
      reporterEmail: 'john.public@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const response = await app.inject({
      method: 'GET',
      url: `/api/issues/${initialReport.id}`
    });

    assert.equal(response.statusCode, 200);
    const json = response.json();
    assert.equal(json.success, true);
    assert.equal(json.data.id, 'rep-test-001');
    assert.equal(json.data.reporterEmail, undefined);
  });

  it('GET /api/issues/:id returns 404 for unknown report ID', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/issues/rep-nonexistent-9999'
    });

    assert.equal(response.statusCode, 404);
    const json = response.json();
    assert.equal(json.success, false);
    assert.match(json.message, /not found/i);
  });

  it('GET /api/issues returns paginated issues with filtering support', async () => {
    await IssueRepository.save({
      id: 'rep-filter-1',
      title: 'Pothole A',
      description: 'Hole A',
      category: 'pothole',
      status: 'triaged',
      urgency: 'low',
      location: { address: 'Road 1' },
      createdAt: '2026-11-20T10:00:00.000Z',
      updatedAt: '2026-11-20T10:00:00.000Z'
    });

    await IssueRepository.save({
      id: 'rep-filter-2',
      title: 'Broken light',
      description: 'Dark alley',
      category: 'street_lighting',
      status: 'submitted',
      urgency: 'medium',
      location: { address: 'Alley 2' },
      createdAt: '2026-11-20T11:00:00.000Z',
      updatedAt: '2026-11-20T11:00:00.000Z'
    });

    // 1. Fetch all
    const allResponse = await app.inject({
      method: 'GET',
      url: '/api/issues'
    });
    assert.equal(allResponse.statusCode, 200);
    const allJson = allResponse.json();
    assert.equal(allJson.success, true);
    assert.equal(allJson.count, 2);
    assert.equal(allJson.pagination.total, 2);

    // 2. Filter by category
    const categoryResponse = await app.inject({
      method: 'GET',
      url: '/api/issues?category=pothole'
    });
    assert.equal(categoryResponse.statusCode, 200);
    const categoryJson = categoryResponse.json();
    assert.equal(categoryJson.count, 1);
    assert.equal(categoryJson.data[0].category, 'pothole');

    // 3. Filter by status
    const statusResponse = await app.inject({
      method: 'GET',
      url: '/api/issues?status=submitted'
    });
    assert.equal(statusResponse.statusCode, 200);
    const statusJson = statusResponse.json();
    assert.equal(statusJson.count, 1);
    assert.equal(statusJson.data[0].status, 'submitted');
  });

  it('POST /api/triage/test returns triage and priority without persisting report', async () => {
    const mockTriage = {
      category: 'street_lighting',
      severity: 'medium',
      summary: 'Dark street light outside school',
      safetyRisk: 'moderate',
      publicImpact: 'neighborhood',
      recommendedDepartmentId: 'dept_electrical',
      recommendedDepartment: 'Department of Electrical Services',
      confidence: 0.9,
      reasoning: 'Reduced visibility along school walkway.',
      suggestedActionItems: ['Replace lamp fixture']
    };

    setGeminiClient(createMockGenAIClient(mockTriage));

    const payload = {
      title: 'Dark streetlight near elementary school',
      description: 'The street light has been out for three days.',
      category: 'street_lighting',
      location: {
        address: '50 School Lane',
        contextZone: 'school_hospital_zone'
      }
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/triage/test',
      headers: {
        authorization: 'Bearer admin-test-token'
      },
      payload
    });

    assert.equal(response.statusCode, 200);
    const json = response.json();
    assert.equal(json.success, true);
    assert.equal(json.data.triage.detectedCategory, 'street_lighting');
    assert.equal(json.data.triage.assignedDepartmentId, 'dept_electrical');

    // Priority with school_hospital_zone (+15 points)
    // Severity Medium (15) + Safety Moderate (15) + Impact Neighborhood (10) + Location School (15) = 55 (P3_MEDIUM)
    assert.equal(json.data.priority.totalScore, 55);
    assert.equal(json.data.priority.priorityLevel, 'P3_MEDIUM');

    // Verify nothing was saved to the repository
    const list = await IssueRepository.list();
    assert.equal(list.total, 0);
  });

  it('fails fast when in production mode without Firestore credentials', async () => {
    const originalEnv = env.NODE_ENV;
    try {
      (env as any).NODE_ENV = 'production';
      resetFirebaseClient();

      await assert.rejects(
        async () => {
          await IssueRepository.save({
            id: 'rep-fail-prod',
            title: 'Test',
            description: 'Test',
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
