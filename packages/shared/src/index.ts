import { z } from 'zod';

// Categories of civic issues
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

// Urgency levels
export const CivicIssueUrgencySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical'
]);
export type CivicIssueUrgency = z.infer<typeof CivicIssueUrgencySchema>;

// Status lifecycle
export const CivicIssueStatusSchema = z.enum([
  'submitted',
  'triaged',
  'in_progress',
  'resolved',
  'closed'
]);
export type CivicIssueStatus = z.infer<typeof CivicIssueStatusSchema>;

// Location details
export const LocationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  neighborhood: z.string().optional()
});
export type CivicLocation = z.infer<typeof LocationSchema>;

// AI Triage result schema
export const GeminiTriageResultSchema = z.object({
  detectedCategory: CivicIssueCategorySchema,
  assignedDepartment: z.string(),
  urgency: CivicIssueUrgencySchema,
  reasoning: z.string(),
  summary: z.string(),
  suggestedActionItems: z.array(z.string()),
  confidenceScore: z.number().min(0).max(1)
});
export type GeminiTriageResult = z.infer<typeof GeminiTriageResultSchema>;

// Create Issue Input Schema
export const CreateIssueInputSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(120, 'Title cannot exceed 120 characters'),
  description: z.string().min(15, 'Description must be at least 15 characters').max(2000, 'Description cannot exceed 2000 characters'),
  category: CivicIssueCategorySchema,
  location: LocationSchema,
  imageUrl: z.string().url('Must be a valid image URL').optional().or(z.literal('')),
  reporterName: z.string().min(2, 'Name must be at least 2 characters').optional(),
  reporterEmail: z.string().email('Valid email is required').optional()
});
export type CreateIssueInput = z.infer<typeof CreateIssueInputSchema>;

// Full Issue Schema
export const CivicIssueSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: CivicIssueCategorySchema,
  status: CivicIssueStatusSchema,
  urgency: CivicIssueUrgencySchema,
  location: LocationSchema,
  imageUrl: z.string().optional(),
  reporterId: z.string().optional(),
  reporterName: z.string().optional(),
  reporterEmail: z.string().optional(),
  aiTriage: GeminiTriageResultSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type CivicIssue = z.infer<typeof CivicIssueSchema>;

// Health Check API Response Schema
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

// Generic API Response
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional()
  });
