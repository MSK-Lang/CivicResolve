import type {
  Severity,
  SafetyRisk,
  PublicImpact,
  LocationContextZone,
  PriorityLevel,
  PriorityScore,
  PriorityScoreBreakdown
} from '@civicresolve/shared';

// ============================================================================
// Deterministic Weight Tables
// ============================================================================

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 35,
  high: 25,
  medium: 15,
  low: 5
};

export const SAFETY_RISK_WEIGHTS: Record<SafetyRisk, number> = {
  imminent_danger: 30,
  severe: 22,
  moderate: 15,
  minor: 8,
  none: 0
};

export const PUBLIC_IMPACT_WEIGHTS: Record<PublicImpact, number> = {
  city_wide: 20,
  arterial_road: 15,
  neighborhood: 10,
  isolated: 5
};

export const LOCATION_CONTEXT_WEIGHTS: Record<LocationContextZone, number> = {
  school_hospital_zone: 15,
  major_transit_corridor: 10,
  commercial_high_density: 8,
  standard_residential: 5,
  unknown: 0
};

export interface PriorityEvaluationInput {
  severity: Severity;
  safetyRisk: SafetyRisk;
  publicImpact: PublicImpact;
  contextZone?: LocationContextZone | null;
}

export interface PriorityThresholdConfig {
  priorityLevel: PriorityLevel;
  slaHours: number;
  description: string;
}

/**
 * Resolves priority level and demonstration SLA hours based on total score.
 * Note: SLAs are demonstration targets, not official municipal commitments.
 */
export function resolvePriorityTier(score: number): {
  priorityLevel: PriorityLevel;
  slaHours: number;
} {
  if (score >= 80) {
    return { priorityLevel: 'P1_CRITICAL', slaHours: 4 };
  }
  if (score >= 60) {
    return { priorityLevel: 'P2_HIGH', slaHours: 24 };
  }
  if (score >= 40) {
    return { priorityLevel: 'P3_MEDIUM', slaHours: 72 };
  }
  return { priorityLevel: 'P4_LOW', slaHours: 168 };
}

/**
 * Pure function: calculates deterministic priority score, breakdown, and SLA.
 *
 * Scoring Formula:
 * Total Score = Severity (35) + Safety Risk (30) + Public Impact (20) + Location Context (15)
 * Capped at 100 points.
 *
 * Missing or unknown location context defaults to 0 points.
 * Proximity to sensitive locations is never inferred.
 */
export function calculatePriorityScore(
  input: PriorityEvaluationInput,
  calculatedAt?: string
): PriorityScore {
  const { severity, safetyRisk, publicImpact } = input;
  const contextZone = input.contextZone || 'unknown';

  const severityPoints = SEVERITY_WEIGHTS[severity] ?? 5;
  const safetyRiskPoints = SAFETY_RISK_WEIGHTS[safetyRisk] ?? 0;
  const publicImpactPoints = PUBLIC_IMPACT_WEIGHTS[publicImpact] ?? 5;
  const locationContextPoints = LOCATION_CONTEXT_WEIGHTS[contextZone] ?? 0;

  const rawSum = severityPoints + safetyRiskPoints + publicImpactPoints + locationContextPoints;
  const totalScore = Math.min(100, Math.max(0, rawSum));

  const { priorityLevel, slaHours } = resolvePriorityTier(totalScore);

  const breakdown: PriorityScoreBreakdown = {
    severityPoints,
    safetyRiskPoints,
    publicImpactPoints,
    locationContextPoints
  };

  const explanation = `${priorityLevel} (Score: ${totalScore}/100, SLA: ${slaHours}h) = Severity: ${severityPoints}/35 (${severity}) + Safety Risk: ${safetyRiskPoints}/30 (${safetyRisk}) + Public Impact: ${publicImpactPoints}/20 (${publicImpact}) + Location: ${locationContextPoints}/15 (${contextZone}). Note: SLAs are demonstration targets.`;

  return {
    totalScore,
    priorityLevel,
    slaHours,
    breakdown,
    explanation,
    calculatedAt: calculatedAt || new Date().toISOString()
  };
}
