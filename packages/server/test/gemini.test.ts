import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  triageComplaintWithGemini,
  triageIssueWithGemini,
  buildRulesFallbackTriage,
  validateImageInput,
  initGemini,
  isGeminiReady,
  resetGeminiClient,
  InvalidInputError,
  DEFAULT_GEMINI_MODEL,
  type TriageComplaintInput,
  type GeminiModelClient
} from '../src/services/gemini.js';
import { env } from '../src/config/env.js';

// Helper to create a mock GenAI client matching ai.models.generateContent
function createMockGenAIClient(
  textResponse: string,
  options: {
    delayMs?: number;
    onCall?: (params: any) => void;
  } = {}
): GeminiModelClient {
  return {
    models: {
      async generateContent(params: any) {
        if (options.onCall) {
          options.onCall(params);
        }
        if (options.delayMs && options.delayMs > 0) {
          await new Promise((res) => setTimeout(res, options.delayMs));
        }
        return {
          text: textResponse
        };
      }
    }
  };
}

function createFailingMockClient(errorMessage: string): GeminiModelClient {
  return {
    models: {
      async generateContent(_params: any) {
        throw new Error(errorMessage);
      }
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

describe('Modernized Gemini Multimodal Triage Service (@google/genai)', () => {
  describe('SDK Initialization & Model Selection', () => {
    it('initializes GenAI client correctly when API key is configured', () => {
      resetGeminiClient();
      assert.equal(isGeminiReady(), false);

      // Temporarily set a dummy key to test init
      const origKey = env.GEMINI_API_KEY;
      try {
        env.GEMINI_API_KEY = 'test-api-key-12345';
        initGemini();
        assert.equal(isGeminiReady(), true);
      } finally {
        env.GEMINI_API_KEY = origKey;
        resetGeminiClient();
      }
    });

    it('uses gemini-3.8-flash as the default model in generateContent', async () => {
      let selectedModel = '';
      const mockClient = createMockGenAIClient(JSON.stringify(validGeminiOutput), {
        onCall: (params) => {
          selectedModel = params.model;
        }
      });

      await triageComplaintWithGemini(sampleInput, { client: mockClient });
      assert.equal(selectedModel, DEFAULT_GEMINI_MODEL);
      assert.equal(selectedModel, 'gemini-3.8-flash');
    });

    it('allows overriding model selection through options', async () => {
      let selectedModel = '';
      const mockClient = createMockGenAIClient(JSON.stringify(validGeminiOutput), {
        onCall: (params) => {
          selectedModel = params.model;
        }
      });

      await triageComplaintWithGemini(sampleInput, {
        client: mockClient,
        model: 'gemini-3.8-pro'
      });
      assert.equal(selectedModel, 'gemini-3.8-pro');
    });
  });

  describe('Text-Only and Multimodal Ingestion', () => {
    it('successfully triages text-only complaint with valid Gemini response', async () => {
      const mockClient = createMockGenAIClient(JSON.stringify(validGeminiOutput));
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

    it('passes multimodal image content parts (JPEG, PNG, WebP) to Gemini', async () => {
      const mimeTypes: ('image/jpeg' | 'image/png' | 'image/webp')[] = [
        'image/jpeg',
        'image/png',
        'image/webp'
      ];

      for (const mimeType of mimeTypes) {
        let capturedContents: any[] = [];
        const mockClient = createMockGenAIClient(JSON.stringify(validGeminiOutput), {
          onCall: (params) => {
            capturedContents = params.contents;
          }
        });

        const inputWithImage: TriageComplaintInput = {
          ...sampleInput,
          image: {
            dataBase64: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
            mimeType
          }
        };

        const result = await triageComplaintWithGemini(inputWithImage, { client: mockClient });
        assert.equal(result.triageSource, 'gemini');

        const imagePart = capturedContents.find((p) => p && typeof p === 'object' && p.inlineData);
        assert.ok(imagePart, `Expected inlineData part for ${mimeType}`);
        assert.equal(imagePart.inlineData.mimeType, mimeType);
      }
    });

    it('rejects invalid uploads with InvalidInputError rather than silently accepting', async () => {
      // 1. Invalid MIME type
      const invalidMimeInput: TriageComplaintInput = {
        ...sampleInput,
        image: {
          dataBase64: 'abc',
          // @ts-expect-error testing invalid mime rejection
          mimeType: 'image/gif'
        }
      };

      await assert.rejects(
        () => triageComplaintWithGemini(invalidMimeInput),
        (err: Error) => {
          assert.ok(err instanceof InvalidInputError);
          assert.ok(err.message.includes('Unsupported image MIME type'));
          return true;
        }
      );

      // 2. Oversized image > 5MB
      const oversizedInput: TriageComplaintInput = {
        ...sampleInput,
        image: {
          dataBase64: 'A'.repeat(8_000_000), // ~6MB
          mimeType: 'image/png'
        }
      };

      await assert.rejects(
        () => triageComplaintWithGemini(oversizedInput),
        (err: Error) => {
          assert.ok(err instanceof InvalidInputError);
          assert.ok(err.message.includes('exceeds the 5MB upload limit'));
          return true;
        }
      );
    });
  });

  describe('Department Registry & Security Enforcement', () => {
    it('correctly maps valid approved department ID', async () => {
      const mockClient = createMockGenAIClient(JSON.stringify(validGeminiOutput));
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });
      assert.equal(result.assignedDepartmentId, 'dept_transportation');
      assert.equal(result.assignedDepartment, 'Department of Transportation & Infrastructure');
    });

    it('enforces canonical department registry over arbitrary LLM hallucinations', async () => {
      const hallucinatedOutput = {
        ...validGeminiOutput,
        recommendedDepartmentId: 'dept_arbitrary_hallucinated_name',
        recommendedDepartment: 'Hallucinated Space Division'
      };

      const mockClient = createMockGenAIClient(JSON.stringify(hallucinatedOutput));
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });

      assert.equal(result.assignedDepartmentId, 'dept_transportation');
      assert.equal(result.assignedDepartment, 'Department of Transportation & Infrastructure');
    });

    it('passes abortSignal in config for request cancellation', async () => {
      let passedConfig: any = null;
      const mockClient = createMockGenAIClient(JSON.stringify(validGeminiOutput), {
        onCall: (params) => {
          passedConfig = params.config;
        }
      });

      await triageComplaintWithGemini(sampleInput, { client: mockClient });
      assert.ok(passedConfig?.abortSignal instanceof AbortSignal);
      assert.equal(passedConfig?.responseMimeType, 'application/json');
    });
  });

  describe('Human Review Flag Logic', () => {
    it('flags reviewRequired = true when AI confidence is below 75%', async () => {
      const lowConfidenceOutput = {
        ...validGeminiOutput,
        confidence: 0.65
      };
      const mockClient = createMockGenAIClient(JSON.stringify(lowConfidenceOutput));
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });

      assert.equal(result.reviewRequired, true);
      assert.ok(result.reviewReason?.includes('Low model confidence (65% < 75%)'));
    });

    it('flags reviewRequired = true when safetyRisk is imminent_danger', async () => {
      const dangerousOutput = {
        ...validGeminiOutput,
        confidence: 0.95,
        safetyRisk: 'imminent_danger'
      };
      const mockClient = createMockGenAIClient(JSON.stringify(dangerousOutput));
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });

      assert.equal(result.reviewRequired, true);
      assert.ok(result.reviewReason?.includes('Imminent danger'));
    });

    it('keeps reviewRequired = false for confident, non-imminent complaints', async () => {
      const normalOutput = {
        ...validGeminiOutput,
        confidence: 0.90,
        safetyRisk: 'moderate'
      };
      const mockClient = createMockGenAIClient(JSON.stringify(normalOutput));
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });

      assert.equal(result.reviewRequired, false);
      assert.equal(result.reviewReason, null);
    });
  });

  describe('Resilience & Bounded Rules Fallbacks', () => {
    it('activates rules fallback when API key is missing', async () => {
      const result = await triageComplaintWithGemini(sampleInput, { apiKey: '' });

      assert.equal(result.triageSource, 'rules_fallback');
      assert.equal(result.aiConfidence, null); // Strictly null
      assert.equal(result.reviewRequired, true);
      assert.ok(result.reviewReason?.includes('GEMINI_API_KEY is not configured'));
    });

    it('activates rules fallback on invalid non-JSON output', async () => {
      const mockClient = createMockGenAIClient('Here is an evaluation in plain text: high priority.');
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });

      assert.equal(result.triageSource, 'rules_fallback');
      assert.equal(result.aiConfidence, null);
      assert.equal(result.reviewRequired, true);
      assert.ok(result.reviewReason?.includes('malformed non-JSON output'));
    });

    it('activates rules fallback on schema validation failure', async () => {
      const invalidSchemaJson = JSON.stringify({
        category: 'unrecognized_category',
        severity: 'fatal'
      });
      const mockClient = createMockGenAIClient(invalidSchemaJson);
      const result = await triageComplaintWithGemini(sampleInput, { client: mockClient });

      assert.equal(result.triageSource, 'rules_fallback');
      assert.equal(result.aiConfidence, null);
      assert.equal(result.reviewRequired, true);
      assert.ok(result.reviewReason?.includes('Schema validation failure'));
    });

    it('activates rules fallback when request times out (> timeoutMs)', async () => {
      const slowClient = createMockGenAIClient(JSON.stringify(validGeminiOutput), {
        delayMs: 150
      });
      const result = await triageComplaintWithGemini(sampleInput, {
        client: slowClient,
        timeoutMs: 40
      });

      assert.equal(result.triageSource, 'rules_fallback');
      assert.equal(result.aiConfidence, null);
      assert.equal(result.reviewRequired, true);
      assert.ok(result.reviewReason?.includes('timed out'));
    });

    it('activates rules fallback on provider API failure (quota / network)', async () => {
      const failingClient = createFailingMockClient('Resource has been exhausted (quota exceeded).');
      const result = await triageComplaintWithGemini(sampleInput, { client: failingClient });

      assert.equal(result.triageSource, 'rules_fallback');
      assert.equal(result.aiConfidence, null);
      assert.equal(result.reviewRequired, true);
      assert.ok(result.reviewReason?.includes('quota exceeded'));
    });

    it('preserves original citizen complaint without data loss in fallback', () => {
      const fallback = buildRulesFallbackTriage(sampleInput, 'Network partition');

      assert.equal(fallback.triageSource, 'rules_fallback');
      assert.equal(fallback.aiConfidence, null);
      assert.equal(fallback.detectedCategory, 'pothole');
      assert.equal(fallback.assignedDepartmentId, 'dept_transportation');
      assert.ok(fallback.summary.includes('Dangerous deep pothole'));
      assert.ok(fallback.summary.includes('450 Main Street'));
      assert.ok(fallback.suggestedActionItems.length > 0);
    });

    it('verifies that backward-compatible wrapper triageIssueWithGemini works', async () => {
      const mockClient = createMockGenAIClient(JSON.stringify(validGeminiOutput));
      // Call backward-compatible wrapper
      const result = await triageIssueWithGemini({
        title: sampleInput.title,
        description: sampleInput.description,
        category: sampleInput.category,
        location: sampleInput.location
      });

      assert.equal(result.detectedCategory, 'pothole');
      assert.equal(result.urgency, 'high');
      assert.ok(result.assignedDepartment.length > 0);
    });
  });
});
