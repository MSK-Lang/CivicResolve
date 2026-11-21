import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateHaversineDistanceMeters } from '../src/utils/haversine.js';

describe('GeoCluster Haversine and Radius Matching', () => {
  it('correctly calculates zero distance for identical coordinates', () => {
    const dist = calculateHaversineDistanceMeters(
      { latitude: 11.018, longitude: 76.965 },
      { latitude: 11.018, longitude: 76.965 }
    );
    assert.equal(dist, 0);
  });

  it('accurately calculates distance within 500m radius threshold', () => {
    // Gandhipuram cross cut road points ~150 meters apart
    const p1 = { latitude: 11.018321, longitude: 76.965412 };
    const p2 = { latitude: 11.019200, longitude: 76.966100 };
    const dist = calculateHaversineDistanceMeters(p1, p2);
    assert.ok(dist > 50 && dist < 200, `Expected distance ~120m, got ${dist}`);
    assert.ok(dist <= 500, 'Points should be within 500m cluster radius');
  });

  it('rejects coordinates exceeding 500m radius', () => {
    // Gandhipuram to Peelamedu ~5.5 km
    const p1 = { latitude: 11.0183, longitude: 76.9654 };
    const p2 = { latitude: 11.0280, longitude: 77.0120 };
    const dist = calculateHaversineDistanceMeters(p1, p2);
    assert.ok(dist > 5000, `Expected distance > 5km, got ${dist}`);
    assert.ok(dist > 500, 'Points should exceed 500m radius');
  });
});
