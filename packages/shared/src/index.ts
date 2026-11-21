import { z } from 'zod';

// ============================================================================
// 1. Approved Department Registry (Fixed, Immutable Registry)
// ============================================================================

export const DepartmentIdSchema = z.enum([
  'dept_transportation',
  'dept_sanitation',
  'dept_electrical',
  'dept_water',
  'dept_public_safety',
  'dept_parks',
  'dept_general'
]);
export type DepartmentId = z.infer<typeof DepartmentIdSchema>;

export interface DepartmentInfo {
  id: DepartmentId;
  name: string;
  code: string;
  contactEmail: string;
}

export const APPROVED_DEPARTMENTS: readonly DepartmentInfo[] = [
  {
    id: 'dept_transportation',
    name: 'Department of Transportation & Infrastructure',
    code: 'DTI',
    contactEmail: 'transport@city.gov'
  },
  {
    id: 'dept_sanitation',
    name: 'Bureau of Waste Management & Sanitation',
    code: 'BWMS',
    contactEmail: 'sanitation@city.gov'
  },
  {
    id: 'dept_electrical',
    name: 'Bureau of Street Lighting & Electrical Services',
    code: 'BSLES',
    contactEmail: 'lighting@city.gov'
  },
  {
    id: 'dept_water',
    name: 'Municipal Water & Sewer Authority',
    code: 'MWSA',
    contactEmail: 'water@city.gov'
  },
  {
    id: 'dept_public_safety',
    name: 'Public Safety & Emergency Management Division',
    code: 'PSEMD',
    contactEmail: 'safety@city.gov'
  },
  {
    id: 'dept_parks',
    name: 'Parks & City Beautification Department',
    code: 'PCBD',
    contactEmail: 'parks@city.gov'
  },
  {
    id: 'dept_general',
    name: 'General Municipal Ombudsman Service',
    code: 'GMOS',
    contactEmail: 'ombudsman@city.gov'
  }
] as const;

export function getDepartmentById(id: DepartmentId): DepartmentInfo {
  const found = APPROVED_DEPARTMENTS.find(d => d.id === id);
  return found || APPROVED_DEPARTMENTS[APPROVED_DEPARTMENTS.length - 1];
}

// ============================================================================
// 2. Categories, Urgency, Severity, Safety Risk & Public Impact
// ============================================================================

export const CivicIssueCategorySchema = z.enum([
  'pothole',
  'sanitation',
  'street_lighting',
  'water_supply',
  'public_safety',
  'traffic_signals',
  'parks_recreation',
  'other'
]);
export type CivicIssueCategory = z.infer<typeof CivicIssueCategorySchema>;
export const CivicCategoryEnum = CivicIssueCategorySchema;

// Legacy 4-level urgency (kept for backwards compatibility)
export const CivicIssueUrgencySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical'
]);
export type CivicIssueUrgency = z.infer<typeof CivicIssueUrgencySchema>;

// Phase 2 Severity enum
export const SeveritySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical'
]);
export type Severity = z.infer<typeof SeveritySchema>;

// Phase 2 Safety Risk enum
export const SafetyRiskSchema = z.enum([
  'none',
  'minor',
  'moderate',
  'severe',
  'imminent_danger'
]);
export type SafetyRisk = z.infer<typeof SafetyRiskSchema>;

// Phase 2 Public Impact enum
export const PublicImpactSchema = z.enum([
  'isolated',
  'neighborhood',
  'arterial_road',
  'city_wide'
]);
export type PublicImpact = z.infer<typeof PublicImpactSchema>;

// Status lifecycle
export const CivicIssueStatusSchema = z.enum([
  'submitted',
  'processing',
  'triaged',
  'needs_review',
  'in_progress',
  'resolved',
  'closed',
  'failed'
]);
export type CivicIssueStatus = z.infer<typeof CivicIssueStatusSchema>;

// Triage Source Enum
export const TriageSourceSchema = z.enum([
  'gemini',
  'rules_fallback',
  'pending'
]);
export type TriageSource = z.infer<typeof TriageSourceSchema>;

// ============================================================================
// 3. Location, Coordinates & Image Metadata
// ============================================================================

export const LocationContextZoneSchema = z.enum([
  'school_hospital_zone',
  'major_transit_corridor',
  'commercial_high_density',
  'standard_residential',
  'unknown'
]);
export type LocationContextZone = z.infer<typeof LocationContextZoneSchema>;

export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180')
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

export const LocationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  neighborhood: z.string().optional(),
  coordinates: CoordinatesSchema.optional(),
  // Flat coordinates for backwards compatibility
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  contextZone: LocationContextZoneSchema.optional()
});
export type CivicLocation = z.infer<typeof LocationSchema>;

export const ImageMetadataSchema = z.object({
  url: z.string().url().optional(),
  dataBase64: z.string().optional(),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
  fileSizeBytes: z.number().positive().optional(),
  capturedAt: z.string().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional()
});
export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;

// ============================================================================
// 4. Strict Gemini Multimodal Triage Schema
// ============================================================================

export const StrictGeminiTriageOutputSchema = z.object({
  category: CivicIssueCategorySchema,
  severity: SeveritySchema,
  summary: z.string().min(5).max(300),
  safetyRisk: SafetyRiskSchema,
  publicImpact: PublicImpactSchema,
  recommendedDepartmentId: DepartmentIdSchema,
  recommendedDepartment: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(10).max(1000),
  suggestedActionItems: z.array(z.string()).default([])
});
export type StrictGeminiTriageOutput = z.infer<typeof StrictGeminiTriageOutputSchema>;

// Triage Evaluation Record (stored on Report and Incident)
export const TriageEvaluationSchema = z.object({
  triageSource: TriageSourceSchema,
  // Genuine AI model confidence (strictly null for rule-based fallbacks)
  aiConfidence: z.number().min(0).max(1).nullable(),
  reviewRequired: z.boolean(),
  reviewReason: z.string().nullable().optional(),
  detectedCategory: CivicIssueCategorySchema,
  assignedDepartmentId: DepartmentIdSchema,
  assignedDepartment: z.string(),
  severity: SeveritySchema,
  safetyRisk: SafetyRiskSchema,
  publicImpact: PublicImpactSchema,
  summary: z.string(),
  reasoning: z.string(),
  suggestedActionItems: z.array(z.string()),
  evaluatedAt: z.string()
});
export type TriageEvaluation = z.infer<typeof TriageEvaluationSchema>;

// Backwards-compatible GeminiTriageResultSchema
export const GeminiTriageResultSchema = z.object({
  detectedCategory: CivicIssueCategorySchema,
  assignedDepartment: z.string(),
  assignedDepartmentId: DepartmentIdSchema.optional(),
  urgency: CivicIssueUrgencySchema,
  severity: SeveritySchema.optional(),
  safetyRisk: SafetyRiskSchema.optional(),
  publicImpact: PublicImpactSchema.optional(),
  reasoning: z.string(),
  summary: z.string(),
  suggestedActionItems: z.array(z.string()),
  confidenceScore: z.number().min(0).max(1),
  triageSource: TriageSourceSchema.optional(),
  aiConfidence: z.number().min(0).max(1).nullable().optional(),
  reviewRequired: z.boolean().optional(),
  reviewReason: z.string().nullable().optional()
});
export type GeminiTriageResult = z.infer<typeof GeminiTriageResultSchema>;

// ============================================================================
// 5. Deterministic Priority Scoring Schema
// ============================================================================

export const PriorityLevelSchema = z.enum([
  'P1_CRITICAL',
  'P2_HIGH',
  'P3_MEDIUM',
  'P4_LOW'
]);
export type PriorityLevel = z.infer<typeof PriorityLevelSchema>;

export const PriorityScoreBreakdownSchema = z.object({
  severityPoints: z.number().min(0).max(35),
  safetyRiskPoints: z.number().min(0).max(30),
  publicImpactPoints: z.number().min(0).max(20),
  locationContextPoints: z.number().min(0).max(15)
});
export type PriorityScoreBreakdown = z.infer<typeof PriorityScoreBreakdownSchema>;

export const PriorityScoreSchema = z.object({
  totalScore: z.number().min(0).max(100),
  priorityLevel: PriorityLevelSchema,
  slaHours: z.number().positive(),
  breakdown: PriorityScoreBreakdownSchema,
  explanation: z.string(),
  calculatedAt: z.string()
});
export type PriorityScore = z.infer<typeof PriorityScoreSchema>;

// ============================================================================
// 6. Citizen Complaint Submission Input Schema
// ============================================================================

export const CreateIssueInputSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(120, 'Title cannot exceed 120 characters'),
  description: z.string().min(15, 'Description must be at least 15 characters').max(2000, 'Description cannot exceed 2000 characters'),
  category: CivicIssueCategorySchema,
  location: LocationSchema,
  imageUrl: z.string().url('Must be a valid image URL').optional().or(z.literal('')),
  image: ImageMetadataSchema.optional(),
  reporterName: z.string().min(2, 'Name must be at least 2 characters').optional(),
  reporterEmail: z.string().email('Valid email is required').optional(),
  reporterPhone: z.string().optional()
});
export type CreateIssueInput = z.infer<typeof CreateIssueInputSchema>;

// ============================================================================
// 7. Audit Event History Schema (Append-only)
// ============================================================================

export const ReportAuditEventTypeSchema = z.enum([
  'report_submitted',
  'triage_completed',
  'triage_fallback',
  'priority_calculated',
  'review_flagged',
  'status_updated',
  'triage_overridden'
]);
export type ReportAuditEventType = z.infer<typeof ReportAuditEventTypeSchema>;

export const ReportAuditEventSchema = z.object({
  id: z.string(),
  reportId: z.string(),
  eventType: ReportAuditEventTypeSchema,
  timestamp: z.string(),
  actor: z.object({
    type: z.enum(['citizen', 'system', 'ai_agent', 'admin']),
    id: z.string().optional(),
    name: z.string().optional()
  }),
  details: z.record(z.unknown()).optional(),
  description: z.string()
});
export type ReportAuditEvent = z.infer<typeof ReportAuditEventSchema>;

// ============================================================================
// 8. Separate Entities: Citizen Report vs Clustered Incident
// ============================================================================

// Entity A: Individual Citizen Report (Raw citizen submission preserved)
export const CivicReportSchema = z.object({
  id: z.string(),
  incidentId: z.string().nullable(), // Null until linked to a clustered incident
  rawSubmission: z.object({
    title: z.string(),
    description: z.string(),
    category: CivicIssueCategorySchema,
    location: LocationSchema,
    image: ImageMetadataSchema.optional(),
    imageUrl: z.string().optional(),
    reporterName: z.string().optional(),
    reporterEmail: z.string().optional(),
    reporterPhone: z.string().optional(),
    submittedAt: z.string()
  }),
  triage: TriageEvaluationSchema,
  priorityScore: PriorityScoreSchema,
  status: CivicIssueStatusSchema,
  auditHistory: z.array(ReportAuditEventSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type CivicReport = z.infer<typeof CivicReportSchema>;

// Entity B: Municipal Incident (Aggregates multiple citizen reports)
export const CivicIncidentSchema = z.object({
  id: z.string(),
  masterReportId: z.string(),
  linkedReportIds: z.array(z.string()).min(1),
  reportCount: z.number().int().min(1),
  category: CivicIssueCategorySchema,
  assignedDepartmentId: DepartmentIdSchema,
  assignedDepartment: z.string(),
  location: LocationSchema,
  effectivePriority: PriorityScoreSchema,
  status: CivicIssueStatusSchema,
  summary: z.string(),
  actionPlan: z.array(z.string()),
  assignedOfficer: z.string().optional(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type CivicIncident = z.infer<typeof CivicIncidentSchema>;

// Backwards-Compatible Issue Schema (Preserved for existing routes and components)
export const CivicIssueSchema = z.object({
  id: z.string(),
  incidentId: z.string().nullable().optional(),
  title: z.string(),
  description: z.string(),
  category: CivicIssueCategorySchema,
  status: CivicIssueStatusSchema,
  urgency: CivicIssueUrgencySchema,
  location: LocationSchema,
  imageUrl: z.string().optional(),
  image: ImageMetadataSchema.optional(),
  reporterId: z.string().optional(),
  reporterName: z.string().optional(),
  reporterEmail: z.string().optional(),
  reporterPhone: z.string().optional(),
  aiTriage: GeminiTriageResultSchema.optional(),
  triageEvaluation: TriageEvaluationSchema.optional(),
  priorityScore: PriorityScoreSchema.optional(),
  auditHistory: z.array(ReportAuditEventSchema).optional().default([]),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type CivicIssue = z.infer<typeof CivicIssueSchema>;

// Public Sanitized Issue Schema (Strictly protects citizen privacy)
export const PublicCivicIssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: CivicIssueCategorySchema,
  status: CivicIssueStatusSchema,
  urgency: CivicIssueUrgencySchema,
  location: z.object({
    address: z.string(),
    neighborhood: z.string().optional(),
    contextZone: LocationContextZoneSchema.optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }),
  imageUrl: z.string().optional(),
  image: z.object({
    url: z.string().optional(),
    mimeType: z.string().optional()
  }).optional(),
  aiTriage: GeminiTriageResultSchema.optional(),
  triageEvaluation: TriageEvaluationSchema.optional(),
  priorityScore: PriorityScoreSchema.optional(),
  auditHistory: z.array(z.object({
    id: z.string(),
    reportId: z.string().optional(),
    eventType: ReportAuditEventTypeSchema,
    timestamp: z.string(),
    actor: z.object({
      type: z.enum(['citizen', 'system', 'ai_agent', 'admin'])
    }),
    description: z.string()
  })).optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type PublicCivicIssue = z.infer<typeof PublicCivicIssueSchema>;

// Administrative Issue Schema (Full details including personal info and audit history)
export const AdminCivicIssueSchema = CivicIssueSchema.extend({
  auditHistory: z.array(ReportAuditEventSchema)
});
export type AdminCivicIssue = z.infer<typeof AdminCivicIssueSchema>;

// Administrative Update Request Schema
export const AdminUpdateIssueSchema = z.object({
  status: CivicIssueStatusSchema.optional(),
  urgency: CivicIssueUrgencySchema.optional(),
  assignedDepartmentId: DepartmentIdSchema.optional(),
  notes: z.string().max(1000).optional()
});
export type AdminUpdateIssue = z.infer<typeof AdminUpdateIssueSchema>;

// ============================================================================
// 8. Health and Generic API Schemas
// ============================================================================

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  uptime: z.number(),
  timestamp: z.string(),
  version: z.string(),
  environment: z.string(),
  services: z.object({
    database: z.enum(['connected', 'not_configured', 'error']),
    gemini: z.enum(['ready', 'not_configured', 'error']),
    auth: z.enum(['ready', 'not_configured', 'error'])
  })
});
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional()
  });
