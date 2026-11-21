import type { FastifyPluginAsync } from 'fastify';
import {
  CreateIssueInputSchema,
  CivicIssueCategorySchema,
  CivicIssueStatusSchema,
  AdminUpdateIssueSchema,
  type CivicIssue,
  type CivicIssueCategory,
  type CivicIssueStatus,
  type PublicCivicIssue,
  type AdminCivicIssue,
  type ReportAuditEvent,
  type ReportAuditEventType
} from '@civicresolve/shared';
import { IssueRepository, saveReportImage } from '../services/firebase.js';
import {
  triageComplaintWithGemini,
  validateImageInput,
  buildRulesFallbackTriage,
  InvalidInputError
} from '../services/gemini.js';
import { calculatePriorityScore } from '../services/priority.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { submissionRateLimiter, readRateLimiter } from '../middleware/rate-limiter.js';
import crypto from 'crypto';
import { z } from 'zod';

// Query parameters schema for list endpoints
const ListIssuesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  category: CivicIssueCategorySchema.optional(),
  status: CivicIssueStatusSchema.optional()
});

/**
 * Strict Public Serializer:
 * Completely redacts citizen PII (email, phone, reporterId, reporterName).
 * Coarsens precise GPS coordinates to ~100m (3 decimal places) to protect home privacy.
 * Omits internal bucket storage paths and internal credentials.
 */
export function serializePublicReport(issue: CivicIssue): PublicCivicIssue {
  const coarseLocation = {
    address: issue.location.address,
    neighborhood: issue.location.neighborhood,
    contextZone: issue.location.contextZone,
    latitude: typeof issue.location.latitude === 'number'
      ? Math.round(issue.location.latitude * 1000) / 1000
      : undefined,
    longitude: typeof issue.location.longitude === 'number'
      ? Math.round(issue.location.longitude * 1000) / 1000
      : undefined
  };

  const publicImage = issue.image
    ? {
        url: issue.image.url || issue.imageUrl,
        mimeType: issue.image.mimeType
      }
    : (issue.imageUrl ? { url: issue.imageUrl } : undefined);

  // Redact all personal identifiers from audit events for public consumption
  const publicAuditHistory = (issue.auditHistory || []).map(event => ({
    id: event.id,
    reportId: event.reportId,
    eventType: event.eventType,
    timestamp: event.timestamp,
    actor: {
      type: event.actor.type
    },
    description: event.description
  }));

  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    category: issue.category,
    status: issue.status,
    urgency: issue.urgency,
    location: coarseLocation,
    imageUrl: issue.imageUrl,
    image: publicImage,
    aiTriage: issue.aiTriage,
    triageEvaluation: issue.triageEvaluation,
    priorityScore: issue.priorityScore,
    auditHistory: publicAuditHistory,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt
  };
}

// Backwards-compatibility alias
export const sanitizePublicIssue = serializePublicReport;

/**
 * Administrative Serializer:
 * Includes full unredacted reporter identity, exact GPS, and append-only audit history.
 */
export function serializeAdminReport(issue: CivicIssue): AdminCivicIssue {
  return {
    ...issue,
    auditHistory: issue.auditHistory || []
  };
}

/**
 * Helper to construct immutable, timestamped audit events
 */
export function createAuditEvent(params: {
  reportId: string;
  eventType: ReportAuditEventType;
  actor: { type: 'citizen' | 'system' | 'ai_agent' | 'admin'; id?: string; name?: string };
  description: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}): ReportAuditEvent {
  return {
    id: crypto.randomUUID(),
    reportId: params.reportId,
    eventType: params.eventType,
    timestamp: params.timestamp || new Date().toISOString(),
    actor: params.actor,
    description: params.description,
    details: params.details
  };
}

export const issueRoutes: FastifyPluginAsync = async (fastify) => {
  // ==========================================================================
  // Public Citizen Endpoints
  // ==========================================================================

  // GET /api/issues - Retrieve civic reports with pagination (PII redacted)
  fastify.get('/api/issues', { preHandler: [readRateLimiter] }, async (request, reply) => {
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

    const sanitized = issues.map(serializePublicReport);

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

  // GET /api/issues/:id - Retrieve single report and triage details (PII redacted)
  fastify.get<{ Params: { id: string } }>(
    '/api/issues/:id',
    { preHandler: [readRateLimiter] },
    async (request, reply) => {
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
      data: serializePublicReport(issue)
    };
  });

  // POST /api/issues - Create a report, persist initial submission, run triage & priority
  fastify.post(
    '/api/issues',
    { preHandler: [submissionRateLimiter] },
    async (request, reply) => {
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

    // 3. Generate collision-resistant UUID
    const reportId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // 4. Process image storage: strip large base64 data before database persistence
    const savedImage = await saveReportImage(reportId, input.image);
    const imageUrl = savedImage?.url || input.imageUrl || undefined;

    // 5. Initialize append-only audit event history (client cannot modify)
    const auditHistory: ReportAuditEvent[] = [
      createAuditEvent({
        reportId,
        eventType: 'report_submitted',
        actor: {
          type: 'citizen',
          id: input.reporterEmail || undefined,
          name: input.reporterName || 'Citizen'
        },
        description: `Citizen report submitted under category "${input.category}".`,
        details: {
          category: input.category,
          hasImage: Boolean(input.image || input.imageUrl),
          contextZone: input.location.contextZone || 'unknown'
        },
        timestamp
      })
    ];

    // 6. Persist original citizen report BEFORE calling Gemini
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
      reporterPhone: input.reporterPhone,
      auditHistory,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await IssueRepository.save(initialReport);

    // 7. Run Gemini Multimodal Triage or Deterministic Fallback
    let triageResult;
    try {
      triageResult = await triageComplaintWithGemini({
        title: input.title,
        description: input.description,
        category: input.category,
        location: input.location,
        image: input.image // Pass raw image with base64 for model vision analysis
      });

      // Record triage completion in audit history
      if (triageResult.triageSource === 'gemini') {
        auditHistory.push(
          createAuditEvent({
            reportId,
            eventType: 'triage_completed',
            actor: { type: 'ai_agent', name: 'gemini-3.8-flash' },
            description: `AI triage completed with ${Math.round((triageResult.aiConfidence || 0) * 100)}% confidence. Assigned to ${triageResult.assignedDepartment}.`,
            details: {
              aiConfidence: triageResult.aiConfidence,
              assignedDepartmentId: triageResult.assignedDepartmentId,
              severity: triageResult.severity,
              safetyRisk: triageResult.safetyRisk,
              publicImpact: triageResult.publicImpact
            }
          })
        );
      } else {
        auditHistory.push(
          createAuditEvent({
            reportId,
            eventType: 'triage_fallback',
            actor: { type: 'system', name: 'rules_fallback_engine' },
            description: `Deterministic rules fallback applied: ${triageResult.reasoning}. Assigned to ${triageResult.assignedDepartment}.`,
            details: {
              assignedDepartmentId: triageResult.assignedDepartmentId,
              severity: triageResult.severity
            }
          })
        );
      }
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

      auditHistory.push(
        createAuditEvent({
          reportId,
          eventType: 'triage_fallback',
          actor: { type: 'system', name: 'rules_fallback_engine' },
          description: `Deterministic rules fallback applied after exception: ${(err as Error).message}.`,
          details: {
            assignedDepartmentId: triageResult.assignedDepartmentId
          }
        })
      );
    }

    // 8. Record human review requirement if flagged
    if (triageResult.reviewRequired) {
      auditHistory.push(
        createAuditEvent({
          reportId,
          eventType: 'review_flagged',
          actor: { type: 'system', name: 'triage_safety_policy' },
          description: triageResult.reviewReason || 'Supervisor review required before field dispatch.',
          details: { reviewReason: triageResult.reviewReason }
        })
      );
    }

    // 9. Calculate deterministic priority score
    const priorityScore = calculatePriorityScore({
      severity: triageResult.severity,
      safetyRisk: triageResult.safetyRisk,
      publicImpact: triageResult.publicImpact,
      contextZone: input.location.contextZone
    });

    auditHistory.push(
      createAuditEvent({
        reportId,
        eventType: 'priority_calculated',
        actor: { type: 'system', name: 'deterministic_priority_engine' },
        description: `Priority scored at ${priorityScore.totalScore}/100 (${priorityScore.priorityLevel}, SLA ${priorityScore.slaHours}h).`,
        details: {
          totalScore: priorityScore.totalScore,
          priorityLevel: priorityScore.priorityLevel,
          slaHours: priorityScore.slaHours,
          breakdown: priorityScore.breakdown
        }
      })
    );

    // 10. Resolve final lifecycle status
    const finalStatus: CivicIssueStatus = triageResult.reviewRequired ? 'needs_review' : 'triaged';

    // 11. Persist updated report with complete triage, priority results, and audit history
    const updatedReport = await IssueRepository.update(reportId, {
      status: finalStatus,
      urgency: triageResult.urgency,
      aiTriage: triageResult,
      triageEvaluation: triageResult,
      priorityScore,
      auditHistory,
      updatedAt: new Date().toISOString()
    });

    const resultIssue = updatedReport || initialReport;

    return reply.status(201).send({
      success: true,
      data: serializePublicReport(resultIssue),
      message: 'Civic report registered and triaged successfully.'
    });
  });

  // ==========================================================================
  // Administrative Endpoints (Strictly Authorized)
  // ==========================================================================

  // GET /api/admin/issues - Full administrative report listing with unredacted PII & audit logs
  fastify.get(
    '/api/admin/issues',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const parseResult = ListIssuesQuerySchema.safeParse(request.query);

      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Invalid query parameters',
          details: parseResult.error.errors
        });
      }

      const { limit, offset, category, status } = parseResult.data;
      const { issues, total } = await IssueRepository.list({ limit, offset, category, status });

      return {
        success: true,
        data: issues.map(serializeAdminReport),
        count: issues.length,
        pagination: {
          total,
          limit,
          offset
        }
      };
    }
  );

  // GET /api/admin/issues/:id - Full administrative report detail with unredacted PII & audit logs
  fastify.get<{ Params: { id: string } }>(
    '/api/admin/issues/:id',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const { id } = request.params;
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
        data: serializeAdminReport(issue)
      };
    }
  );

  // PATCH /api/admin/issues/:id - Administrative status update or triage override
  fastify.patch<{ Params: { id: string } }>(
    '/api/admin/issues/:id',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
      const { id } = request.params;
      const parseResult = AdminUpdateIssueSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Invalid administrative update payload',
          details: parseResult.error.errors
        });
      }

      const updates = parseResult.data;
      const existing = await IssueRepository.getById(id.trim());

      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: `Report with ID "${id}" was not found`
        });
      }

      const adminUser = request.adminUser;
      const currentAuditHistory = existing.auditHistory || [];
      const now = new Date().toISOString();

      // Record administrative audit event
      const eventType: ReportAuditEventType = updates.status && updates.status !== existing.status
        ? 'status_updated'
        : 'triage_overridden';

      const auditEvent = createAuditEvent({
        reportId: id,
        eventType,
        actor: {
          type: 'admin',
          id: adminUser?.uid,
          name: adminUser?.email || 'Administrator'
        },
        description: `Administrative update: ${
          updates.status ? `status changed from ${existing.status} to ${updates.status}. ` : ''
        }${updates.notes ? `Note: "${updates.notes}"` : ''}`.trim(),
        details: {
          previousStatus: existing.status,
          newStatus: updates.status,
          previousUrgency: existing.urgency,
          newUrgency: updates.urgency,
          notes: updates.notes
        },
        timestamp: now
      });

      const updated = await IssueRepository.atomicUpdateWithAudit(
        id.trim(),
        {
          ...(updates.status ? { status: updates.status } : {}),
          ...(updates.urgency ? { urgency: updates.urgency } : {})
        },
        auditEvent
      );

      return {
        success: true,
        data: serializeAdminReport(updated || existing),
        message: 'Report successfully updated by administrator.'
      };
    }
  );

  // POST /api/triage/test - Directly test AI triage (Strictly Protected to prevent quota abuse)
  fastify.post(
    '/api/triage/test',
    { preHandler: [requireAdminAuth] },
    async (request, reply) => {
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
    }
  );
};
