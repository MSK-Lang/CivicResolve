import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePriorityScore,
  resolvePriorityTier,
  SEVERITY_WEIGHTS,
  SAFETY_RISK_WEIGHTS,
  PUBLIC_IMPACT_WEIGHTS,
  LOCATION_CONTEXT_WEIGHTS
} from '../src/services/priority.js';
import {
  PriorityScoreSchema,
  type Severity,
  type SafetyRisk,
  type PublicImpact,
  type LocationContextZone
} from '@civicresolve/shared';

describe('Deterministic Priority Engine', () => {
  describe('Weight Tables Coverage', () => {
    it('covers all severity levels with exact weights', () => {
      assert.equal(SEVERITY_WEIGHTS.critical, 35);
      assert.equal(SEVERITY_WEIGHTS.high, 25);
      assert.equal(SEVERITY_WEIGHTS.medium, 15);
      assert.equal(SEVERITY_WEIGHTS.low, 5);

      const severities: Severity[] = ['critical', 'high', 'medium', 'low'];
      for (const severity of severities) {
        const score = calculatePriorityScore({
          severity,
          safetyRisk: 'none',
          publicImpact: 'isolated',
          contextZone: 'unknown'
        });
        assert.equal(score.breakdown.severityPoints, SEVERITY_WEIGHTS[severity]);
      }
    });

    it('covers all safety risk levels with exact weights', () => {
      assert.equal(SAFETY_RISK_WEIGHTS.imminent_danger, 30);
      assert.equal(SAFETY_RISK_WEIGHTS.severe, 22);
      assert.equal(SAFETY_RISK_WEIGHTS.moderate, 15);
      assert.equal(SAFETY_RISK_WEIGHTS.minor, 8);
      assert.equal(SAFETY_RISK_WEIGHTS.none, 0);

      const risks: SafetyRisk[] = ['imminent_danger', 'severe', 'moderate', 'minor', 'none'];
      for (const safetyRisk of risks) {
        const score = calculatePriorityScore({
          severity: 'low',
          safetyRisk,
          publicImpact: 'isolated',
          contextZone: 'unknown'
        });
        assert.equal(score.breakdown.safetyRiskPoints, SAFETY_RISK_WEIGHTS[safetyRisk]);
      }
    });

    it('covers all public impact levels with exact weights', () => {
      assert.equal(PUBLIC_IMPACT_WEIGHTS.city_wide, 20);
      assert.equal(PUBLIC_IMPACT_WEIGHTS.arterial_road, 15);
      assert.equal(PUBLIC_IMPACT_WEIGHTS.neighborhood, 10);
      assert.equal(PUBLIC_IMPACT_WEIGHTS.isolated, 5);

      const impacts: PublicImpact[] = ['city_wide', 'arterial_road', 'neighborhood', 'isolated'];
      for (const publicImpact of impacts) {
        const score = calculatePriorityScore({
          severity: 'low',
          safetyRisk: 'none',
          publicImpact,
          contextZone: 'unknown'
        });
        assert.equal(score.breakdown.publicImpactPoints, PUBLIC_IMPACT_WEIGHTS[publicImpact]);
      }
    });

    it('covers all location context zones with exact weights', () => {
      assert.equal(LOCATION_CONTEXT_WEIGHTS.school_hospital_zone, 15);
      assert.equal(LOCATION_CONTEXT_WEIGHTS.major_transit_corridor, 10);
      assert.equal(LOCATION_CONTEXT_WEIGHTS.commercial_high_density, 8);
      assert.equal(LOCATION_CONTEXT_WEIGHTS.standard_residential, 5);
      assert.equal(LOCATION_CONTEXT_WEIGHTS.unknown, 0);

      const zones: LocationContextZone[] = [
        'school_hospital_zone',
        'major_transit_corridor',
        'commercial_high_density',
        'standard_residential',
        'unknown'
      ];
      for (const contextZone of zones) {
        const score = calculatePriorityScore({
          severity: 'low',
          safetyRisk: 'none',
          publicImpact: 'isolated',
          contextZone
        });
        assert.equal(score.breakdown.locationContextPoints, LOCATION_CONTEXT_WEIGHTS[contextZone]);
      }
    });
  });

  describe('Priority Thresholds & SLAs', () => {
    it('correctly maps all 4 priority tiers and demonstration SLAs', () => {
      const p1 = resolvePriorityTier(80);
      assert.equal(p1.priorityLevel, 'P1_CRITICAL');
      assert.equal(p1.slaHours, 4);

      const p1Upper = resolvePriorityTier(100);
      assert.equal(p1Upper.priorityLevel, 'P1_CRITICAL');
      assert.equal(p1Upper.slaHours, 4);

      const p2 = resolvePriorityTier(60);
      assert.equal(p2.priorityLevel, 'P2_HIGH');
      assert.equal(p2.slaHours, 24);

      const p2Upper = resolvePriorityTier(79);
      assert.equal(p2Upper.priorityLevel, 'P2_HIGH');
      assert.equal(p2Upper.slaHours, 24);

      const p3 = resolvePriorityTier(40);
      assert.equal(p3.priorityLevel, 'P3_MEDIUM');
      assert.equal(p3.slaHours, 72);

      const p3Upper = resolvePriorityTier(59);
      assert.equal(p3Upper.priorityLevel, 'P3_MEDIUM');
      assert.equal(p3Upper.slaHours, 72);

      const p4 = resolvePriorityTier(39);
      assert.equal(p4.priorityLevel, 'P4_LOW');
      assert.equal(p4.slaHours, 168);

      const p4Lower = resolvePriorityTier(0);
      assert.equal(p4Lower.priorityLevel, 'P4_LOW');
      assert.equal(p4Lower.slaHours, 168);
    });

    it('generates P1_CRITICAL for high-severity hazards', () => {
      // 35 (critical) + 30 (imminent) + 15 (arterial) + 10 (transit) = 90
      const score = calculatePriorityScore({
        severity: 'critical',
        safetyRisk: 'imminent_danger',
        publicImpact: 'arterial_road',
        contextZone: 'major_transit_corridor'
      });
      assert.equal(score.totalScore, 90);
      assert.equal(score.priorityLevel, 'P1_CRITICAL');
      assert.equal(score.slaHours, 4);
    });

    it('generates P2_HIGH for significant community issues', () => {
      // 25 (high) + 15 (moderate) + 15 (arterial) + 5 (residential) = 60
      const score = calculatePriorityScore({
        severity: 'high',
        safetyRisk: 'moderate',
        publicImpact: 'arterial_road',
        contextZone: 'standard_residential'
      });
      assert.equal(score.totalScore, 60);
      assert.equal(score.priorityLevel, 'P2_HIGH');
      assert.equal(score.slaHours, 24);
    });

    it('generates P3_MEDIUM for routine neighborhood reports', () => {
      // 15 (medium) + 8 (minor) + 10 (neighborhood) + 8 (commercial) = 41
      const score = calculatePriorityScore({
        severity: 'medium',
        safetyRisk: 'minor',
        publicImpact: 'neighborhood',
        contextZone: 'commercial_high_density'
      });
      assert.equal(score.totalScore, 41);
      assert.equal(score.priorityLevel, 'P3_MEDIUM');
      assert.equal(score.slaHours, 72);
    });

    it('generates P4_LOW for minor isolated issues', () => {
      // 5 (low) + 0 (none) + 5 (isolated) + 0 (unknown) = 10
      const score = calculatePriorityScore({
        severity: 'low',
        safetyRisk: 'none',
        publicImpact: 'isolated',
        contextZone: 'unknown'
      });
      assert.equal(score.totalScore, 10);
      assert.equal(score.priorityLevel, 'P4_LOW');
      assert.equal(score.slaHours, 168);
    });
  });

  describe('Edge Cases and Boundaries', () => {
    it('handles unknown or omitted location context as zero points', () => {
      const explicitUnknown = calculatePriorityScore({
        severity: 'medium',
        safetyRisk: 'moderate',
        publicImpact: 'neighborhood',
        contextZone: 'unknown'
      });

      const omittedContext = calculatePriorityScore({
        severity: 'medium',
        safetyRisk: 'moderate',
        publicImpact: 'neighborhood'
      });

      const nullContext = calculatePriorityScore({
        severity: 'medium',
        safetyRisk: 'moderate',
        publicImpact: 'neighborhood',
        contextZone: null
      });

      assert.equal(explicitUnknown.breakdown.locationContextPoints, 0);
      assert.equal(omittedContext.breakdown.locationContextPoints, 0);
      assert.equal(nullContext.breakdown.locationContextPoints, 0);
      assert.equal(explicitUnknown.totalScore, omittedContext.totalScore);
      assert.equal(omittedContext.totalScore, nullContext.totalScore);
    });

    it('computes exact maximum possible score (100)', () => {
      // 35 (critical) + 30 (imminent) + 20 (city_wide) + 15 (school/hospital) = 100
      const maxScore = calculatePriorityScore({
        severity: 'critical',
        safetyRisk: 'imminent_danger',
        publicImpact: 'city_wide',
        contextZone: 'school_hospital_zone'
      });
      assert.equal(maxScore.totalScore, 100);
      assert.equal(maxScore.priorityLevel, 'P1_CRITICAL');
      assert.equal(maxScore.slaHours, 4);
    });

    it('computes exact minimum possible score (10)', () => {
      // 5 (low) + 0 (none) + 5 (isolated) + 0 (unknown) = 10
      const minScore = calculatePriorityScore({
        severity: 'low',
        safetyRisk: 'none',
        publicImpact: 'isolated',
        contextZone: 'unknown'
      });
      assert.equal(minScore.totalScore, 10);
      assert.equal(minScore.priorityLevel, 'P4_LOW');
      assert.equal(minScore.slaHours, 168);
    });

    it('ensures total score never exceeds 100', () => {
      const score = calculatePriorityScore({
        severity: 'critical',
        safetyRisk: 'imminent_danger',
        publicImpact: 'city_wide',
        contextZone: 'school_hospital_zone'
      });
      assert.ok(score.totalScore <= 100);
    });

    it('produces deterministic output for identical input', () => {
      const input = {
        severity: 'high' as Severity,
        safetyRisk: 'severe' as SafetyRisk,
        publicImpact: 'arterial_road' as PublicImpact,
        contextZone: 'major_transit_corridor' as LocationContextZone
      };
      const fixedTime = '2026-11-21T13:00:00.000Z';

      const run1 = calculatePriorityScore(input, fixedTime);
      const run2 = calculatePriorityScore(input, fixedTime);

      assert.deepEqual(run1, run2);
    });

    it('conforms strictly to the shared Zod PriorityScoreSchema', () => {
      const score = calculatePriorityScore({
        severity: 'high',
        safetyRisk: 'severe',
        publicImpact: 'arterial_road',
        contextZone: 'school_hospital_zone'
      });

      const parseResult = PriorityScoreSchema.safeParse(score);
      assert.ok(parseResult.success, `Validation failed: ${JSON.stringify(parseResult.error?.errors)}`);
    });

    it('includes a transparent, explainable breakdown string', () => {
      const score = calculatePriorityScore({
        severity: 'critical',
        safetyRisk: 'imminent_danger',
        publicImpact: 'city_wide',
        contextZone: 'school_hospital_zone'
      });

      assert.ok(score.explanation.includes('P1_CRITICAL'));
      assert.ok(score.explanation.includes('100/100'));
      assert.ok(score.explanation.includes('Severity: 35/35'));
      assert.ok(score.explanation.includes('Safety Risk: 30/30'));
      assert.ok(score.explanation.includes('Public Impact: 20/20'));
      assert.ok(score.explanation.includes('Location: 15/15'));
      assert.ok(score.explanation.includes('Note: SLAs are demonstration targets'));
    });
  });
});
