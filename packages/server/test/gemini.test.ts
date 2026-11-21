import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  triageComplaintWithGemini,
  buildRulesFallbackTriage,
  validateImageInput,
  getFallbackDepartmentForCategory,
  type TriageComplaintInput,
  type GeminiModelClient
} from '../src/services/gemini.js';
import { StrictGeminiTriageOutputSchema } from '@civicresolve/shared';

// Helper to create a mock Gemini client
function createMockClient(textResponse: string, delayMs = 0): GeminiModelClient {
  return {
    async generateContent(_params: any) {
      if (delayMs > 0) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
      return {
        response: {
          text: () => textResponse
        }
      };
    }
  };
}

function createFailingMockClient(errorMessage: string): GeminiModelClient {
  return {
    async generateContent(_params: any) {
      throw new Error(errorMessage);
    }
  };
}

const sampleInput: TriageComplaintInput = {
  title: 'Dangerous deep pothole',
  description: 'A 2-foot wide pothole near crosswalk on Main Street causing vehicular damage.',
  category: 'pothole',
  location: {
    address: '450 Main Street',
    neighborhood: 'Downtown',
    contextZone: 'major_transit_corridor'
  }
};

const validGeminiOutput = {
  category: 'pothole',
  severity: 'high',
  summary: 'Severe road depression on Main Street posing traffic risk.',
  safetyRisk: 'moderate',
  publicImpact: 'arterial_road',
  recommendedDepartmentId: 'dept_transportation',
  recommendedDepartment: 'Department of Transportation & Infrastructure',
  confidence: 0.94,
  reasoning: 'Visual road depression consistent with rapid pavement asphalt erosion.',
  suggestedActionItems: ['Deploy cold-mix asphalt repair crew', 'Place traffic warning cones']
};

describe('Gemini Multimodal Triage Service', () => {
  describe('Valid Model Responses & Multimodal Ingestion', () => {
    it('successfully triages text-only complaint with valid Gemini response', async () => {
      const mockClient = createMockClient(JSON.stringify(validGeminiOutput));
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });

      assert.equal(result.triageSource, 'gemini');
      assert.equal(result.detectedCategory, 'pothole');
      assert.equal(result.severity, 'high');
      assert.equal(result.assignedDepartmentId, 'dept_transportation');
      assert.equal(result.assignedDepartment, 'Department of Transportation & Infrastructure');
      assert.equal(result.aiConfidence, 0.94);
      assert.equal(result.reviewRequired, false);
      assert.ok(result.suggestedActionItems.length > 0);
    });

    it('processes multimodal image input (JPEG/PNG/WebP) with content parts', async () => {
      let passedContents: any[] = [];
      const capturingClient: GeminiModelClient = {
        async generateContent(params: any) {
          passedContents = params;
          return {
            response: {
              text: () => JSON.stringify(validGeminiOutput)
            }
          };
        }
      };

      const inputWithImage: TriageComplaintInput = {
        ...sampleInput,
        image: {
          dataBase64: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          mimeType: 'image/jpeg'
        }
      };

      const result = await triageComplaintWithGemini(inputWithImage, { client: capturingClient });
      assert.equal(result.triageSource, 'gemini');
      // Verify image part was passed to model
      const imagePart = passedContents.find((p) => p && typeof p === 'object' && p.inlineData);
      assert.ok(imagePart, 'Multimodal inlineData part must be passed to model');
      assert.equal(imagePart.inlineData.mimeType, 'image/jpeg');
    });

    it('validates image MIME types and rejects unsupported formats', () => {
      const validJpg = validateImageInput({
        dataBase64: 'abc',
        mimeType: 'image/jpeg'
      });
      assert.equal(validJpg.valid, true);

      const invalidGif = validateImageInput({
        dataBase64: 'abc',
        // @ts-expect-error testing invalid mime
        mimeType: 'image/gif'
      });
      assert.equal(invalidGif.valid, false);
      assert.ok(invalidGif.error?.includes('Unsupported image MIME type'));
    });

    it('enforces image size limit (5MB max)', () => {
      // 8 million base64 characters ~ 6MB
      const hugeBase64 = 'A'.repeat(8_000_000);
      const oversized = validateImageInput({
        dataBase64: hugeBase64,
        mimeType: 'image/png'
      });
      assert.equal(oversized.valid, false);
      assert.ok(oversized.error?.includes('exceeds the 5MB limit'));
    });
  });

  describe('Department Restrictions & Registry Enforcement', () => {
    it('correctly maps valid approved department ID', async () => {
      const mockClient = createMockClient(JSON.stringify(validGeminiOutput));
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });
      assert.equal(result.assignedDepartmentId, 'dept_transportation');
      assert.equal(result.assignedDepartment, 'Department of Transportation & Infrastructure');
    });

    it('replaces arbitrary or hallucinated department IDs with deterministic mapping', async () => {
      const hallucinatedOutput = {
        ...validGeminiOutput,
        recommendedDepartmentId: 'dept_random_fake_department_name',
        recommendedDepartment: 'Fake Robot Department'
      };

      const mockClient = createMockClient(JSON.stringify(hallucinatedOutput));
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });

      // Must NOT use hallucinated department name or ID
      assert.equal(result.assignedDepartmentId, 'dept_transportation');
      assert.equal(result.assignedDepartment, 'Department of Transportation & Infrastructure');
    });
  });

  describe('Human Review Flag Logic', () => {
    it('flags reviewRequired = true when AI confidence is below 75%', async () => {
      const lowConfidenceOutput = {
        ...validGeminiOutput,
        confidence: 0.62
      };
      const mockClient = createMockClient(JSON.stringify(lowConfidenceOutput));
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });

      assert.equal(result.reviewRequired, true);
      assert.ok(result.reviewReason?.includes('Low model confidence (62% < 75%)'));
    });

    it('flags reviewRequired = true when safetyRisk is imminent_danger', async () => {
      const dangerousOutput = {
        ...validGeminiOutput,
        confidence: 0.95,
        safetyRisk: 'imminent_danger'
      };
      const mockClient = createMockClient(JSON.stringify(dangerousOutput));
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });

      assert.equal(result.reviewRequired, true);
      assert.ok(result.reviewReason?.includes('Imminent danger'));
    });

    it('keeps reviewRequired = false for high confidence, non-imminent issues', async () => {
      const normalOutput = {
        ...validGeminiOutput,
        confidence: 0.88,
        safetyRisk: 'moderate'
      };
      const mockClient = createMockClient(JSON.stringify(normalOutput));
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });

      assert.equal(result.reviewRequired, false);
      assert.equal(result.reviewReason, null);
    });
  });

  describe('Resilience & Bounded Fallbacks', () => {
    it('activates rules fallback when API key is missing', async () => {
      // Empty API key and no custom client provided
      const result = await triageComplaintWithGemini(sampleInput, { apiKey: '' });

      assert.equal(result.triageSource, 'rules_fallback');
      assert.equal(result.aiConfidence, null); // Strictly null
      assert.equal(result.reviewRequired, true);
      assert.ok(result.reviewReason?.includes('GEMINI_API_KEY is not configured'));
    });

    it('activates rules fallback on invalid non-JSON output', async () => {
      const mockClient = createMockClient('Sorry, as an AI I am unable to inspect roads.');
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });

      assert.equal(result.triageSource, 'rules_fallback');
      assert.equal(result.aiConfidence, null);
      assert.equal(result.reviewRequired, true);
      assert.ok(result.reviewReason?.includes('malformed non-JSON output'));
    });

    it('activates rules fallback on schema validation failure', async () => {
      const invalidSchemaJson = JSON.stringify({
        category: 'spaceship_breakdown', // Invalid category
        severity: 'extreme'              // Invalid severity
      });
      const mockClient = createMockClient(invalidSchemaJson);
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });

      assert.equal(result.triageSource, 'rules_fallback');
      assert.equal(result.aiConfidence, null);
      assert.equal(result.reviewRequired, true);
      assert.ok(result.reviewReason?.includes('Schema validation failure'));
    });

    it('activates rules fallback when request times out (> timeoutMs)', async () => {
      // Mock client takes 200ms, timeout configured to 50ms
      const slowClient = createMockClient(JSON.stringify(validGeminiOutput), 200);
      const result = await triageComplaintWithGemini(sampleInput, {
        client: slowClient,
        timeoutMs: 50
      });

      assert.equal(result.triageSource, 'rules_fallback');
      assert.equal(result.aiConfidence, null);
      assert.equal(result.reviewRequired, true);
      assert.ok(result.reviewReason?.includes('timed out'));
    });

    it('activates rules fallback when API throws an error', async () => {
      const failingClient = createFailingMockClient('Resource has been exhausted (e.g. check quota).');
      const result = await triageComplaintWithGemini(sampleInput, { client: failingClient });

      assert.equal(result.triageSource, 'rules_fallback');
      assert.equal(result.aiConfidence, null);
      assert.equal(result.reviewRequired, true);
      assert.ok(result.reviewReason?.includes('Resource has been exhausted'));
    });

    it('preserves original complaint context in rules fallback without data loss', () => {
      const fallback = buildRulesFallbackTriage(sampleInput, 'Network disconnect');

      assert.equal(fallback.triageSource, 'rules_fallback');
      assert.equal(fallback.aiConfidence, null);
      assert.equal(fallback.detectedCategory, 'pothole');
      assert.equal(fallback.assignedDepartmentId, 'dept_transportation');
      assert.ok(fallback.summary.includes('Dangerous deep pothole'));
      assert.ok(fallback.summary.includes('450 Main Street'));
      assert.ok(fallback.suggestedActionItems.length > 0);
    });

    it('detects critical urgency from keywords in rules fallback', () => {
      const emergencyInput: TriageComplaintInput = {
        title: 'Emergency live wire sparking',
        description: 'Electrical pole collapsed and live wire sparking near sidewalk',
        category: 'street_lighting',
        location: { address: '12 8th St' }
      };

      const fallback = buildRulesFallbackTriage(emergencyInput, 'Simulated failure');
      assert.equal(fallback.severity, 'critical');
      assert.equal(fallback.safetyRisk, 'imminent_danger');
      assert.equal(fallback.assignedDepartmentId, 'dept_electrical');
    });
  });
});
