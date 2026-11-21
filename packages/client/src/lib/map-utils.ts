import type { CivicIssue, DuplicateCandidate } from '@civicresolve/shared';

export interface ValidatedCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapClusterPair {
  id: string;
  cluster: DuplicateCandidate;
  primaryCoords: [number, number];
  duplicateCoords: [number, number];
  primaryIssue?: CivicIssue;
  duplicateIssue?: CivicIssue;
  distanceMeters: number;
}

/**
 * Extracts and validates GPS coordinates from a CivicIssue.
 * Returns [latitude, longitude] if valid, or null if missing or out of geographic bounds.
 */
export function getIssueCoordinates(issue: CivicIssue): [number, number] | null {
  if (!issue || !issue.location) return null;

  const lat = issue.location.latitude ?? issue.location.coordinates?.latitude;
  const lon = issue.location.longitude ?? issue.location.coordinates?.longitude;

  if (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    !(lat === 0 && lon === 0) // Treat 0,0 (Null Island) as missing coordinates
  ) {
    return [lat, lon];
  }

  return null;
}

/**
 * Returns distinct, accessible hex colors based on report priority level.
 */
export function getPriorityMarkerColor(priority?: string): string {
  switch (priority) {
    case 'P1_CRITICAL':
    case 'critical':
      return '#DC2626'; // Red-600
    case 'P2_HIGH':
    case 'high':
      return '#D97706'; // Amber-600
    case 'P3_MEDIUM':
    case 'medium':
      return '#2563EB'; // Blue-600
    case 'P4_LOW':
    case 'low':
      return '#16A34A'; // Green-600
    default:
      return '#765448'; // CivicResolve Brand Earth
  }
}

/**
 * Returns status badge background and border classes.
 */
export function getStatusBadgeStyles(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case 'submitted':
      return { bg: 'bg-zinc-100 border-zinc-300', text: 'text-zinc-800', label: 'Submitted' };
    case 'triaged':
      return { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', label: 'Triaged' };
    case 'needs_review':
      return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', label: 'Needs Review' };
    case 'in_progress':
      return { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-800', label: 'In Progress' };
    case 'resolved':
      return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', label: 'Resolved' };
    case 'closed':
      return { bg: 'bg-zinc-100 border-zinc-200', text: 'text-zinc-600', label: 'Closed' };
    default:
      return { bg: 'bg-zinc-50 border-zinc-200', text: 'text-zinc-700', label: status };
  }
}

/**
 * Filters reports for map display based on active criteria and GPS validity.
 */
export function filterMapIssues(
  issues: CivicIssue[],
  filters: { category?: string; priority?: string; status?: string }
): CivicIssue[] {
  return issues.filter((issue) => {
    // 1. Must have valid coordinates
    if (!getIssueCoordinates(issue)) return false;

    // 2. Category filter
    if (filters.category && filters.category !== 'all' && issue.category !== filters.category) {
      return false;
    }

    // 3. Status filter
    if (filters.status && filters.status !== 'all' && issue.status !== filters.status) {
      return false;
    }

    // 4. Priority filter
    if (filters.priority && filters.priority !== 'all') {
      const pLevel = issue.priorityScore?.priorityLevel;
      const urgency = issue.urgency;
      if (pLevel !== filters.priority && urgency !== filters.priority) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Computes centroid and default zoom level for a collection of reports.
 */
export function calculateMapCenter(
  issues: CivicIssue[],
  fallbackCenter: [number, number] = [12.9716, 77.5946]
): { center: [number, number]; zoom: number; bounds?: [[number, number], [number, number]] } {
  const coords = issues.map(getIssueCoordinates).filter((c): c is [number, number] => c !== null);

  if (coords.length === 0) {
    return { center: fallbackCenter, zoom: 12 };
  }

  if (coords.length === 1) {
    return { center: coords[0], zoom: 15 };
  }

  let minLat = coords[0][0];
  let maxLat = coords[0][0];
  let minLon = coords[0][1];
  let maxLon = coords[0][1];
  let sumLat = 0;
  let sumLon = 0;

  for (const [lat, lon] of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    sumLat += lat;
    sumLon += lon;
  }

  return {
    center: [sumLat / coords.length, sumLon / coords.length],
    zoom: 13,
    bounds: [
      [minLat, minLon],
      [maxLat, maxLon]
    ]
  };
}

/**
 * Resolves cluster candidates to geographic pairs by cross-referencing issue coordinates.
 */
export function resolveClusterCoordinates(
  clusters: DuplicateCandidate[],
  issues: CivicIssue[]
): MapClusterPair[] {
  const issueMap = new Map<string, CivicIssue>();
  for (const issue of issues) {
    issueMap.set(issue.id, issue);
  }

  const pairs: MapClusterPair[] = [];

  for (const cluster of clusters) {
    const primary = issueMap.get(cluster.primaryReport.id);
    const duplicate = issueMap.get(cluster.duplicateReport.id);

    if (!primary || !duplicate) continue;

    const primaryCoords = getIssueCoordinates(primary);
    const duplicateCoords = getIssueCoordinates(duplicate);

    if (primaryCoords && duplicateCoords) {
      pairs.push({
        id: cluster.id,
        cluster,
        primaryCoords,
        duplicateCoords,
        primaryIssue: primary,
        duplicateIssue: duplicate,
        distanceMeters: cluster.distanceMeters
      });
    }
  }

  return pairs;
}
