import type { FastifyPluginAsync } from 'fastify';
import {
  CreateIssueInputSchema,
  CivicIssueCategorySchema,
  CivicIssueStatusSchema,
  type CivicIssue,
  type CivicIssueCategory,
  type CivicIssueStatus
} from '@civicresolve/shared';
import { IssueRepository, saveReportImage } from '../services/firebase.js';
import {
  triageComplaintWithGemini,
  validateImageInput,
  buildRulesFallbackTriage,
  InvalidInputError
} from '../services/gemini.js';
import { calculatePriorityScore } from '../services/priority.js';
import crypto from 'crypto';
import { z } from 'zod';

// Query parameters schema for list endpoint
const ListIssuesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  category: CivicIssueCategorySchema.optional(),
  status: CivicIssueStatusSchema.optional()
});

/**
 * Masks private citizen information (e.g. email) before public transmission
 */
export function sanitizePublicIssue(issue: CivicIssue): CivicIssue {
  return {
    ...issue,
    reporterEmail: issue.reporterEmail ? maskEmail(issue.reporterEmail) : undefined
  };
}

function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex <= 1) return '***@' + (email.split('@')[1] || 'domain');
  const user = email.substring(0, atIndex);
  const domain = email.substring(atIndex + 1);
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

export const issueRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/issues - Retrieve civic reports with pagination
  fastify.get('/api/issues', async (request, reply) => {
    const parseResult = ListIssuesQuerySchema.safeParse(request.query);

    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Bad Request',
        message: 'Invalid query parameters',
        details: parseResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    const { limit, offset, category, status } = parseResult.data;
    const { issues, total } = await IssueRepository.list({ limit, offset, category, status });

    const sanitized = issues.map(sanitizePublicIssue);

    return {
      success: true,
      data: sanitized,
      count: sanitized.length,
      pagination: {
        total,
        limit,
        offset
      }
    };
  });

  // GET /api/issues/:id - Retrieve single report and triage details
  fastify.get<{ Params: { id: string } }>('/api/issues/:id', async (request, reply) => {
    const { id } = request.params;
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      return reply.status(400).send({
        success: false,
        error: 'Bad Request',
        message: 'Invalid issue ID parameter'
      });
    }

    const issue = await IssueRepository.getById(id.trim());

    if (!issue) {
      return reply.status(404).send({
        success: false,
        error: 'Not Found',
        message: `Report with ID "${id}" was not found`
      });
    }

    return {
      success: true,
      data: sanitizePublicIssue(issue)
    };
  });

  // POST /api/issues - Create a report, persist initial submission, run triage & priority
  fastify.post('/api/issues', async (request, reply) => {
    // 1. Validate submission payload against strict shared schema
    const parseResult = CreateIssueInputSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Bad Request',
        message: 'Invalid report submission payload',
        details: parseResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    const input = parseResult.data;

    // 2. Validate image upload boundaries and MIME type
    if (input.image) {
      const imageValidation = validateImageInput(input.image);
      if (!imageValidation.valid) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: imageValidation.error || 'Invalid image upload'
        });
      }
    }

    const reportId = `rep-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    // 3. Process image storage: strip large base64 data before database persistence
    const savedImage = await saveReportImage(reportId, input.image);
    const imageUrl = savedImage?.url || input.imageUrl || undefined;

    // 4. Persist original citizen report BEFORE calling Gemini
    const initialReport: CivicIssue = {
      id: reportId,
      title: input.title,
      description: input.description,
      category: input.category,
      status: 'submitted',
      urgency: 'medium', // Default urgency pending automated triage
      location: input.location,
      image: savedImage,
      imageUrl,
      reporterName: input.reporterName,
      reporterEmail: input.reporterEmail,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await IssueRepository.save(initialReport);

    // 5. Run Gemini Multimodal Triage or Deterministic Fallback
    let triageResult;
    try {
      triageResult = await triageComplaintWithGemini({
        title: input.title,
        description: input.description,
        category: input.category,
        location: input.location,
        image: input.image // Pass raw image with base64 for model vision analysis
      });
    } catch (err) {
      if (err instanceof InvalidInputError) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: err.message
        });
      }
      // Never lose a report because Gemini fails; fallback gracefully
      triageResult = buildRulesFallbackTriage(
        {
          title: input.title,
          description: input.description,
          category: input.category,
          location: input.location
        },
        (err as Error).message || 'Triage execution failure'
      );
    }

    // 6. Calculate deterministic priority score
    const priorityScore = calculatePriorityScore({
      severity: triageResult.severity,
      safetyRisk: triageResult.safetyRisk,
      publicImpact: triageResult.publicImpact,
      contextZone: input.location.contextZone
    });

    // 7. Resolve final lifecycle status
    const finalStatus: CivicIssueStatus = triageResult.reviewRequired ? 'needs_review' : 'triaged';

    // 8. Persist updated report with complete triage and priority results
    const updatedReport = await IssueRepository.update(reportId, {
      status: finalStatus,
      urgency: triageResult.urgency,
      aiTriage: triageResult,
      triageEvaluation: triageResult,
      priorityScore,
      updatedAt: new Date().toISOString()
    });

    const resultIssue = updatedReport || initialReport;

    return reply.status(201).send({
      success: true,
      data: sanitizePublicIssue(resultIssue),
      message: 'Civic report registered and triaged successfully.'
    });
  });

  // POST /api/triage/test - Directly test AI triage without database persistence
  fastify.post('/api/triage/test', async (request, reply) => {
    const parseResult = CreateIssueInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Bad Request',
        details: parseResult.error.errors
      });
    }

    const input = parseResult.data;
    const triage = await triageComplaintWithGemini({
      title: input.title,
      description: input.description,
      category: input.category,
      location: input.location,
      image: input.image
    });

    const priority = calculatePriorityScore({
      severity: triage.severity,
      safetyRisk: triage.safetyRisk,
      publicImpact: triage.publicImpact,
      contextZone: input.location.contextZone
    });

    return {
      success: true,
      data: {
        triage,
        priority
      }
    };
  });
};
