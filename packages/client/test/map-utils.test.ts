import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getIssueCoordinates,
  getPriorityMarkerColor,
  filterMapIssues,
  calculateMapCenter,
  resolveClusterCoordinates
} from '../src/lib/map-utils.js';
import type { CivicIssue, DuplicateCandidate } from '@civicresolve/shared';

function createMockIssue(overrides: Partial<CivicIssue> = {}): CivicIssue {
  return {
    id: 'issue-1',
    title: 'Damaged storm drain',
    description: 'Deep crack in the concrete drain cover on the sidewalk.',
    category: 'water_supply',
    status: 'submitted',
    urgency: 'high',
    location: {
      address: '100 Market St',
      latitude: 12.9716,
      longitude: 77.5946
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

describe('Geographic Intelligence Map Utilities', () => {
  describe('getIssueCoordinates', () => {
    it('extracts flat latitude and longitude correctly', () => {
      const issue = createMockIssue({
        location: { address: 'Test', latitude: 13.0827, longitude: 80.2707 }
      });
      const coords = getIssueCoordinates(issue);
      assert.deepEqual(coords, [13.0827, 80.2707]);
    });

    it('extracts nested coordinates object correctly', () => {
      const issue = createMockIssue({
        location: {
          address: 'Test',
          coordinates: { latitude: 28.6139, longitude: 77.209 }
        }
      });
      const coords = getIssueCoordinates(issue);
      assert.deepEqual(coords, [28.6139, 77.209]);
    });

    it('returns null when latitude or longitude is missing', () => {
      const issue = createMockIssue({
        location: { address: 'No GPS' }
      });
      assert.equal(getIssueCoordinates(issue), null);
    });

    it('returns null for Null Island (0, 0)', () => {
      const issue = createMockIssue({
        location: { address: 'Null Island', latitude: 0, longitude: 0 }
      });
      assert.equal(getIssueCoordinates(issue), null);
    });

    it('returns null for invalid out-of-range coordinates', () => {
      const issue = createMockIssue({
        location: { address: 'Invalid', latitude: 95.0, longitude: 200.0 }
      });
      assert.equal(getIssueCoordinates(issue), null);
    });
  });

  describe('getPriorityMarkerColor', () => {
    it('returns crimson red for P1_CRITICAL and critical', () => {
      assert.equal(getPriorityMarkerColor('P1_CRITICAL'), '#DC2626');
      assert.equal(getPriorityMarkerColor('critical'), '#DC2626');
    });

    it('returns amber for P2_HIGH and high', () => {
      assert.equal(getPriorityMarkerColor('P2_HIGH'), '#D97706');
      assert.equal(getPriorityMarkerColor('high'), '#D97706');
    });

    it('returns blue for P3_MEDIUM and medium', () => {
      assert.equal(getPriorityMarkerColor('P3_MEDIUM'), '#2563EB');
      assert.equal(getPriorityMarkerColor('medium'), '#2563EB');
    });

    it('returns green for P4_LOW and low', () => {
      assert.equal(getPriorityMarkerColor('P4_LOW'), '#16A34A');
      assert.equal(getPriorityMarkerColor('low'), '#16A34A');
    });
  });

  describe('filterMapIssues', () => {
    const issues: CivicIssue[] = [
      createMockIssue({
        id: '1',
        category: 'pothole',
        status: 'submitted',
        urgency: 'high',
        location: { address: 'A', latitude: 12.97, longitude: 77.59 }
      }),
      createMockIssue({
        id: '2',
        category: 'water_supply',
        status: 'in_progress',
        urgency: 'critical',
        location: { address: 'B', latitude: 12.98, longitude: 77.6 }
      }),
      createMockIssue({
        id: '3',
        category: 'pothole',
        status: 'resolved',
        urgency: 'low',
        location: { address: 'C', latitude: 12.99, longitude: 77.61 }
      }),
      createMockIssue({
        id: '4',
        category: 'pothole',
        status: 'submitted',
        urgency: 'high',
        location: { address: 'D' } // Missing GPS
      })
    ];

    it('excludes reports without GPS coordinates automatically', () => {
      const filtered = filterMapIssues(issues, { category: 'all', priority: 'all', status: 'all' });
      assert.equal(filtered.length, 3);
      assert.ok(!filtered.some((i) => i.id === '4'));
    });

    it('filters by category accurately', () => {
      const filtered = filterMapIssues(issues, { category: 'pothole', priority: 'all', status: 'all' });
      assert.equal(filtered.length, 2);
      assert.ok(filtered.every((i) => i.category === 'pothole'));
    });

    it('filters by status accurately', () => {
      const filtered = filterMapIssues(issues, { category: 'all', priority: 'all', status: 'in_progress' });
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].id, '2');
    });

    it('filters by priority level accurately', () => {
      const filtered = filterMapIssues(issues, { category: 'all', priority: 'critical', status: 'all' });
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].id, '2');
    });
  });

  describe('calculateMapCenter', () => {
    it('returns fallback center when list is empty', () => {
      const result = calculateMapCenter([]);
      assert.deepEqual(result.center, [12.9716, 77.5946]);
      assert.equal(result.zoom, 12);
    });

    it('returns exact report coordinates and higher zoom for a single report', () => {
      const issue = createMockIssue({
        location: { address: 'Single', latitude: 13.0, longitude: 80.0 }
      });
      const result = calculateMapCenter([issue]);
      assert.deepEqual(result.center, [13.0, 80.0]);
      assert.equal(result.zoom, 15);
    });

    it('calculates centroid and bounds across multiple reports', () => {
      const issues = [
        createMockIssue({ location: { address: '1', latitude: 10.0, longitude: 20.0 } }),
        createMockIssue({ location: { address: '2', latitude: 20.0, longitude: 30.0 } })
      ];
      const result = calculateMapCenter(issues);
      assert.deepEqual(result.center, [15.0, 25.0]);
      assert.deepEqual(result.bounds, [
        [10.0, 20.0],
        [20.0, 30.0]
      ]);
    });
  });

  describe('resolveClusterCoordinates', () => {
    const issues = [
      createMockIssue({ id: 'primary-1', location: { address: 'A', latitude: 12.97, longitude: 77.59 } }),
      createMockIssue({ id: 'dup-1', location: { address: 'B', latitude: 12.972, longitude: 77.592 } }),
      createMockIssue({ id: 'orphan-1', location: { address: 'C' } })
    ];

    const clusters: DuplicateCandidate[] = [
      {
        id: 'cluster-1',
        primaryReport: {
          id: 'primary-1',
          title: 'Primary',
          category: 'pothole',
          address: 'A',
          createdAt: '',
          status: 'submitted'
        },
        duplicateReport: {
          id: 'dup-1',
          title: 'Duplicate',
          category: 'pothole',
          address: 'B',
          createdAt: '',
          status: 'submitted'
        },
        distanceMeters: 310,
        category: 'pothole',
        status: 'pending'
      },
      {
        id: 'cluster-2',
        primaryReport: {
          id: 'primary-1',
          title: 'Primary',
          category: 'pothole',
          address: 'A',
          createdAt: '',
          status: 'submitted'
        },
        duplicateReport: {
          id: 'orphan-1',
          title: 'No GPS Dup',
          category: 'pothole',
          address: 'C',
          createdAt: '',
          status: 'submitted'
        },
        distanceMeters: 100,
        category: 'pothole',
        status: 'pending'
      }
    ];

    it('resolves valid coordinates for cluster pairs and skips reports lacking GPS', () => {
      const resolved = resolveClusterCoordinates(clusters, issues);
      assert.equal(resolved.length, 1);
      assert.equal(resolved[0].id, 'cluster-1');
      assert.deepEqual(resolved[0].primaryCoords, [12.97, 77.59]);
      assert.deepEqual(resolved[0].duplicateCoords, [12.972, 77.592]);
      assert.equal(resolved[0].distanceMeters, 310);
    });
  });
});
