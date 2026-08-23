import { supabase } from './db';
import type { Report, Cluster, LiveEvent } from './types';

// ============================================================
// CRISIS MAP — DATABASE REPOSITORY
// All reads/writes to Supabase PostgreSQL + PostGIS
// ============================================================

// ---------- ROW TYPES (Supabase ↔ app model mapping) ----------

interface ReportRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  severity: string;
  status: string;
  location: unknown;       // PostGIS geometry — PostgREST returns GeoJSON
  location_name: string | null;
  reported_at: string;
  reported_by: string | null;
  report_count: number;
  keywords: string[] | null;
  source: string;
}

interface EventRow {
  id: string;
  message: string;
  type: string;
  severity: string;
  timestamp: string;
  report_id: string | null;
}

interface ClusterRow {
  id: string;
  centroid_lat: number;
  centroid_lng: number;
  radius_km: number;
  report_count: number;
  severity: string;
  severity_score: number;
  primary_type: string;
  title: string;
  last_updated: string;
  report_ids: string[];
}

// ---------- MAPPERS ----------

/** Parse PostGIS GeoJSON point into { lat, lng } */
function parseLocation(loc: unknown): { lat: number; lng: number } {
  if (!loc) return { lat: 0, lng: 0 };
  // Supabase PostgREST returns geometry as GeoJSON: { type: "Point", coordinates: [lng, lat] }
  if (typeof loc === 'object' && loc !== null && 'coordinates' in loc) {
    const coords = (loc as { coordinates: number[] }).coordinates;
    return { lat: coords[1], lng: coords[0] };
  }
  return { lat: 0, lng: 0 };
}

/** App Report → PostGIS-friendly insert payload */
function reportToRow(r: Report): Record<string, unknown> {
  // PostGIS WKT point for insert: "SRID=4326;POINT(lng lat)"
  const wkt = `SRID=4326;POINT(${r.location.lng} ${r.location.lat})`;
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    severity: r.severity,
    status: r.status,
    location: wkt,
    location_name: r.locationName,
    reported_at: r.reportedAt,
    reported_by: r.reportedBy,
    report_count: r.reportCount,
    keywords: r.keywords,
    source: r.source,
  };
}

/** Supabase row → App Report */
function rowToReport(row: ReportRow): Report {
  const loc = parseLocation(row.location);
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    type: row.type as Report['type'],
    severity: row.severity as Report['severity'],
    status: row.status as Report['status'],
    location: loc,
    locationName: row.location_name ?? 'Unknown',
    reportedAt: row.reported_at,
    reportedBy: row.reported_by ?? 'Unknown',
    reportCount: row.report_count,
    keywords: row.keywords ?? [],
    source: row.source as Report['source'],
  };
}

/** Supabase row → App LiveEvent */
function rowToEvent(row: EventRow): LiveEvent {
  return {
    id: row.id,
    message: row.message,
    type: row.type as LiveEvent['type'],
    severity: row.severity as LiveEvent['severity'],
    timestamp: row.timestamp,
  };
}

/** ClusterRow → App Cluster */
function rowToCluster(row: ClusterRow): Cluster {
  return {
    id: row.id,
    centroid: { lat: row.centroid_lat, lng: row.centroid_lng },
    radiusKm: row.radius_km,
    reports: [],        // Cluster doesn't embed full reports in API response
    severity: row.severity as Cluster['severity'],
    severityScore: row.severity_score,
    primaryType: row.primary_type as Cluster['primaryType'],
    title: row.title,
    lastUpdated: row.last_updated,
  };
}

// ---------- REPORTS ----------

/** Insert a single report into the DB */
export async function insertReport(report: Report): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .upsert(reportToRow(report), { onConflict: 'id' });
  if (error) console.error('[repo] insertReport error:', error.message);
}

/** Insert multiple reports in one call (used by ingestion pollers) */
export async function insertReports(reports: Report[]): Promise<void> {
  if (reports.length === 0) return;
  const rows = reports.map(reportToRow);
  const { error } = await supabase
    .from('reports')
    .upsert(rows, { onConflict: 'id' });
  if (error) console.error('[repo] insertReports error:', error.message);
}

/** Fetch recent reports, newest first. Supabase row → App Report[] */
export async function listReports(limit = 500): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('reported_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[repo] listReports error:', error.message);
    return [];
  }
  return (data as ReportRow[]).map(rowToReport);
}

/** Update a report's status */
export async function updateReportStatus(id: string, status: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('[repo] updateReportStatus error:', error.message);
    return null;
  }
  return rowToReport(data as ReportRow);
}

/** Find a report by ID */
export async function findReport(id: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return rowToReport(data as ReportRow);
}

// ---------- LIVE EVENTS ----------

/** Insert a single live event */
export async function insertEvent(event: LiveEvent): Promise<void> {
  const { error } = await supabase
    .from('live_events')
    .upsert({
      id: event.id,
      message: event.message,
      type: event.type,
      severity: event.severity,
      timestamp: event.timestamp,
    }, { onConflict: 'id' });
  if (error) console.error('[repo] insertEvent error:', error.message);
}

/** Insert multiple events in one call */
export async function insertEvents(events: LiveEvent[]): Promise<void> {
  if (events.length === 0) return;
  const rows = events.map(e => ({
    id: e.id,
    message: e.message,
    type: e.type,
    severity: e.severity,
    timestamp: e.timestamp,
  }));
  const { error } = await supabase
    .from('live_events')
    .upsert(rows, { onConflict: 'id' });
  if (error) console.error('[repo] insertEvents error:', error.message);
}

/** Fetch recent events, newest first */
export async function listEvents(limit = 50): Promise<LiveEvent[]> {
  const { data, error } = await supabase
    .from('live_events')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[repo] listEvents error:', error.message);
    return [];
  }
  return (data as EventRow[]).map(rowToEvent);
}

// ---------- CLUSTERS ----------

/** Compute clusters using the PostGIS SQL function compute_clusters() */
export async function computeClusters(): Promise<Cluster[]> {
  const { data, error } = await supabase.rpc('compute_clusters');
  if (error) {
    console.error('[repo] computeClusters RPC error:', error.message);
    return [];
  }
  if (!data || !Array.isArray(data)) return [];
  return (data as ClusterRow[]).map(rowToCluster);
}

/** Fallback: compute clusters in-app using PostGIS spatial query */
export async function computeClustersFallback(): Promise<Cluster[]> {
  // Fetch recent unresolved reports
  const { data, error } = await supabase
    .from('reports')
    .select('id, type, severity, reported_at, location_name, location')
    .neq('status', 'resolved')
    .gt('reported_at', new Date(Date.now() - 24 * 3600_000).toISOString())
    .order('reported_at', { ascending: false })
    .limit(1000);
  if (error || !data) {
    console.error('[repo] computeClustersFallback error:', error?.message);
    return [];
  }

  // Grid-based clustering (same algorithm as the original clusterService)
  const groups = new Map<string, ReportRow[]>();
  for (const row of data) {
    const loc = parseLocation(row.location);
    const key = `${(loc.lat * 50).toFixed(0)}_${(loc.lng * 50).toFixed(0)}`;
    const arr = groups.get(key) ?? [];
    arr.push(row as ReportRow);
    groups.set(key, arr);
  }

  let clusterIdx = 0;
  const clusters: Cluster[] = [];
  for (const [, clusterRows] of groups) {
    if (clusterRows.length === 0) continue;
    const clusterId = `cls-fb-${++clusterIdx}-${Date.now().toString(36)}`;

    let totalLat = 0, totalLng = 0;
    for (const row of clusterRows) {
      const loc = parseLocation(row.location);
      totalLat += loc.lat;
      totalLng += loc.lng;
    }
    const centroid = {
      lat: totalLat / clusterRows.length,
      lng: totalLng / clusterRows.length,
    };

    // Severity scoring
    const severityWeights: Record<string, number> = {
      critical: 10, high: 7, moderate: 4, low: 2, info: 1,
    };
    let totalWeight = 0;
    let recencyBoost = 0;
    const typeCounts = new Map<string, number>();
    for (const row of clusterRows) {
      totalWeight += severityWeights[row.severity] ?? 1;
      const age = Date.now() - new Date(row.reported_at).getTime();
      if (age < 3600_000) recencyBoost++;
      typeCounts.set(row.type, (typeCounts.get(row.type) ?? 0) + 1);
    }
    const score = totalWeight + recencyBoost * 3 + clusterRows.length * 2;

    let severity: Cluster['severity'] = 'info';
    if (score >= 60) severity = 'critical';
    else if (score >= 40) severity = 'high';
    else if (score >= 20) severity = 'moderate';
    else if (score >= 10) severity = 'low';

    let primaryType = 'other';
    let maxCount = 0;
    for (const [t, c] of typeCounts) {
      if (c > maxCount) { primaryType = t; maxCount = c; }
    }

    clusters.push({
      id: clusterId,
      centroid,
      radiusKm: 2,
      reports: [],
      severity,
      severityScore: Math.round(score),
      primaryType: primaryType as Report['type'],
      title: `${primaryType.charAt(0).toUpperCase() + primaryType.slice(1)} cluster — ${clusterRows[0].location_name ?? 'Unknown'}`,
      lastUpdated: clusterRows[0].reported_at,
    });
  }

  return clusters.sort((a, b) => b.severityScore - a.severityScore);
}
