import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { CivicIssue, DuplicateCandidate } from '@civicresolve/shared';
import {
  getIssueCoordinates,
  getPriorityMarkerColor,
  getStatusBadgeStyles,
  filterMapIssues,
  calculateMapCenter,
  resolveClusterCoordinates
} from '../../lib/map-utils';
import { Select, Button } from '../ui';
import { MapPin, Layers, Filter, Eye } from 'lucide-react';

interface GeographicIntelligenceMapProps {
  issues: CivicIssue[];
  clusters: DuplicateCandidate[];
  onSelectIssue?: (issue: CivicIssue) => void;
  initialCategory?: string;
  initialStatus?: string;
  initialPriority?: string;
}

// Custom Leaflet DivIcon with clean vector pin styling
function createPriorityMarkerIcon(priority?: string, isClustered = false): L.DivIcon {
  const color = getPriorityMarkerColor(priority);
  const ring = isClustered ? '#D97706' : '#FFFFFF';
  const size = isClustered ? 28 : 24;

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid ${ring};
        box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <div style="
          width: 7px;
          height: 7px;
          background-color: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
  });
}

// Controller to smoothly fit bounds when issues update
function BoundsController({ bounds }: { bounds?: [[number, number], [number, number]] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds[0][0] !== bounds[1][0] && bounds[0][1] !== bounds[1][1]) {
      try {
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
      } catch {
        // Fallback silently if map is unmounted
      }
    }
  }, [bounds, map]);
  return null;
}

export function GeographicIntelligenceMap({
  issues,
  clusters,
  onSelectIssue,
  initialCategory = 'all',
  initialStatus = 'all',
  initialPriority = 'all'
}: GeographicIntelligenceMapProps) {
  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState<string>(initialPriority);
  const [showClusters, setShowClusters] = useState<boolean>(true);

  // Synchronize with external initial filters if changed
  useEffect(() => {
    setCategoryFilter(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setStatusFilter(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setPriorityFilter(initialPriority);
  }, [initialPriority]);

  // Total issues with valid coordinates
  const totalMappableCount = useMemo(() => {
    return issues.filter((i) => getIssueCoordinates(i) !== null).length;
  }, [issues]);

  // Filtered issues with coordinates
  const visibleIssues = useMemo(() => {
    return filterMapIssues(issues, {
      category: categoryFilter,
      status: statusFilter,
      priority: priorityFilter
    });
  }, [issues, categoryFilter, statusFilter, priorityFilter]);

  // Compute map center and bounds
  const { center, zoom, bounds } = useMemo(() => {
    return calculateMapCenter(visibleIssues);
  }, [visibleIssues]);

  // Resolved cluster geographic pairs
  const clusterPairs = useMemo(() => {
    return resolveClusterCoordinates(clusters, issues);
  }, [clusters, issues]);

  // Set of issue IDs involved in clusters
  const clusteredIssueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const c of clusters) {
      ids.add(c.primaryReport.id);
      ids.add(c.duplicateReport.id);
    }
    return ids;
  }, [clusters]);

  return (
    <section className="bg-surface rounded border border-border shadow-sm overflow-hidden flex flex-col">
      {/* Map Header with Filters */}
      <div className="p-4 border-b border-border bg-canvas/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-primary">
            Geographic Intelligence Map
          </h2>
          <span className="text-xs text-ink-muted">
            ({visibleIssues.length} of {totalMappableCount} mapped)
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="!text-xs !py-1 !px-2 max-w-[140px]"
            aria-label="Filter map by category"
          >
            <option value="all">All Categories</option>
            <option value="pothole">Pothole / Road</option>
            <option value="sanitation">Sanitation</option>
            <option value="street_lighting">Lighting</option>
            <option value="water_supply">Water Supply</option>
            <option value="public_safety">Public Safety</option>
            <option value="traffic_signals">Traffic Signal</option>
            <option value="parks_recreation">Parks</option>
            <option value="other">Other</option>
          </Select>

          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="!text-xs !py-1 !px-2 max-w-[130px]"
            aria-label="Filter map by priority"
          >
            <option value="all">All Priorities</option>
            <option value="P1_CRITICAL">P1 Critical</option>
            <option value="P2_HIGH">P2 High</option>
            <option value="P3_MEDIUM">P3 Medium</option>
            <option value="P4_LOW">P4 Low</option>
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="!text-xs !py-1 !px-2 max-w-[130px]"
            aria-label="Filter map by status"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="triaged">Triaged</option>
            <option value="needs_review">Needs Review</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>

          {clusterPairs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClusters(!showClusters)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                showClusters
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-surface text-ink-secondary border-border hover:bg-canvas'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>500m Clusters ({clusterPairs.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Map View Area */}
      <div className="relative w-full h-[480px] bg-[#E5E3DF] overflow-hidden">
        {totalMappableCount === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2 bg-canvas/80">
            <MapPin className="w-8 h-8 text-ink-muted" />
            <h3 className="text-sm font-semibold text-ink-primary font-serif">
              No Geographic Coordinates Available
            </h3>
            <p className="text-xs text-ink-secondary max-w-sm">
              None of the current reports in the register have GPS coordinates attached. Reports with location tags will appear here automatically.
            </p>
          </div>
        ) : visibleIssues.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2 bg-canvas/80">
            <Filter className="w-8 h-8 text-ink-muted" />
            <h3 className="text-sm font-semibold text-ink-primary font-serif">
              No Matching Reports for Current Filter
            </h3>
            <p className="text-xs text-ink-secondary max-w-sm">
              Adjust your category, priority or status filters above to display active geographic locations.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setCategoryFilter('all');
                setStatusFilter('all');
                setPriorityFilter('all');
              }}
              className="text-xs mt-2"
            >
              Reset Map Filters
            </Button>
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom={false}
            className="w-full h-full z-0"
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            <BoundsController bounds={bounds} />

            {/* Duplicate Cluster Visualization (Lines and 500m Circles) */}
            {showClusters &&
              clusterPairs.map((pair) => {
                const isApproved = pair.cluster.status === 'approved';
                const isRejected = pair.cluster.status === 'rejected';
                const strokeColor = isApproved ? '#059669' : isRejected ? '#9CA3AF' : '#D97706';

                return (
                  <React.Fragment key={pair.id}>
                    {/* 500m Radius Circle around primary report */}
                    <Circle
                      center={pair.primaryCoords}
                      radius={500}
                      pathOptions={{
                        color: strokeColor,
                        fillColor: isApproved ? '#D1FAE5' : '#FEF3C7',
                        fillOpacity: 0.12,
                        weight: 1.5,
                        dashArray: '4, 6'
                      }}
                    >
                      <Popup>
                        <div className="text-xs space-y-1">
                          <div className="font-semibold text-ink-primary">
                            500m GeoCluster Zone
                          </div>
                          <div className="text-ink-secondary">
                            Status: <span className="font-mono uppercase font-medium">{pair.cluster.status}</span>
                          </div>
                          <div className="text-ink-muted">
                            Distance: {pair.distanceMeters}m
                          </div>
                        </div>
                      </Popup>
                    </Circle>

                    {/* Connecting Polyline between duplicate pair */}
                    <Polyline
                      positions={[pair.primaryCoords, pair.duplicateCoords]}
                      pathOptions={{
                        color: strokeColor,
                        weight: 2.5,
                        dashArray: isApproved ? undefined : '5, 5'
                      }}
                    >
                      <Popup>
                        <div className="text-xs space-y-1.5 p-1">
                          <span className="font-mono text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            GeoCluster Pair ({pair.distanceMeters}m)
                          </span>
                          <div className="font-semibold text-ink-primary">
                            Primary: &quot;{pair.cluster.primaryReport.title}&quot;
                          </div>
                          <div className="text-ink-secondary">
                            Duplicate: &quot;{pair.cluster.duplicateReport.title}&quot;
                          </div>
                          <div className="text-ink-muted text-[11px]">
                            Decision: <span className="font-mono">{pair.cluster.status}</span>
                          </div>
                        </div>
                      </Popup>
                    </Polyline>
                  </React.Fragment>
                );
              })}

            {/* Individual Report Markers */}
            {visibleIssues.map((issue) => {
              const coords = getIssueCoordinates(issue);
              if (!coords) return null;

              const isClustered = clusteredIssueIds.has(issue.id);
              const priorityLevel = issue.priorityScore?.priorityLevel || issue.urgency;
              const statusStyle = getStatusBadgeStyles(issue.status);
              const icon = createPriorityMarkerIcon(priorityLevel, isClustered);

              return (
                <Marker key={issue.id} position={coords} icon={icon}>
                  <Popup>
                    <div className="p-1 max-w-[240px] space-y-2 text-xs">
                      {/* Category and Status Badge */}
                      <div className="flex items-center justify-between gap-2 border-b border-border pb-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-accent font-semibold truncate">
                          {issue.category.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          {statusStyle.label}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="font-semibold text-ink-primary leading-tight line-clamp-2">
                        {issue.title}
                      </h4>

                      {/* Location address */}
                      <p className="text-[11px] text-ink-muted line-clamp-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{issue.location.address}</span>
                      </p>

                      {/* Priority indicator */}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-ink-secondary">Priority:</span>
                        <span
                          className="font-mono font-semibold text-xs"
                          style={{ color: getPriorityMarkerColor(priorityLevel) }}
                        >
                          {priorityLevel}
                        </span>
                      </div>

                      {/* Inspect button */}
                      {onSelectIssue && (
                        <div className="pt-1.5 border-t border-border">
                          <button
                            type="button"
                            onClick={() => onSelectIssue(issue)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1 bg-ink-primary hover:bg-ink-primary/90 text-white rounded text-[11px] font-medium transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspect Report</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Map Legend */}
      <div className="px-4 py-2.5 bg-canvas/60 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-ink-secondary">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-mono text-[10px] uppercase text-ink-muted">Priority:</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <span>P1 Critical</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
            <span>P2 High</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span>P3 Medium</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-600" />
            <span>P4 Low</span>
          </span>
        </div>

        {clusterPairs.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-amber-800">
              <span className="w-3 h-0.5 bg-amber-500 border-dashed" />
              <span>500m Duplicate Link</span>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
