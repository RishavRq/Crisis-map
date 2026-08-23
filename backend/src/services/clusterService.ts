import { Report, Cluster, Severity, DisasterType } from '../types';

let _clusterId = 0;
const cid = () => `cls-${++_clusterId}-${Date.now().toString(36)}`;

/**
 * Super naive in-memory clustering.
 * In a real PostGIS setup this would use ST_DWithin on the reports table.
 */
export function calculateClusters(reports: Report[]): Cluster[] {
  const groups = new Map<string, Report[]>();

  for (const r of reports) {
    // Round coords to ~2km grid approx
    const key = `${(r.location.lat * 50).toFixed(0)}_${(r.location.lng * 50).toFixed(0)}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }

  return Array.from(groups.entries()).map(([, clusterReports]) => {
    const centroid = {
      lat: clusterReports.reduce((s, r) => s + r.location.lat, 0) / clusterReports.length,
      lng: clusterReports.reduce((s, r) => s + r.location.lng, 0) / clusterReports.length,
    };

    // Calculate severity score
    const severityWeights: Record<Severity, number> = {
      critical: 10, high: 7, moderate: 4, low: 2, info: 1,
    };
    const totalWeight = clusterReports.reduce((s, r) => s + severityWeights[r.severity], 0);
    
    const recencyBoost = clusterReports.filter(r => {
      const age = Date.now() - new Date(r.reportedAt).getTime();
      return age < 3600_000;
    }).length;

    const score = totalWeight + recencyBoost * 3 + clusterReports.length * 2;

    let severity: Severity = 'info';
    if (score >= 60) severity = 'critical';
    else if (score >= 40) severity = 'high';
    else if (score >= 20) severity = 'moderate';
    else if (score >= 10) severity = 'low';

    // Primary type
    const typeCounts = new Map<DisasterType, number>();
    for (const r of clusterReports) {
      typeCounts.set(r.type, (typeCounts.get(r.type) ?? 0) + 1);
    }
    let primaryType: DisasterType = 'other';
    let maxCount = 0;
    for (const [t, c] of typeCounts) {
      if (c > maxCount) { primaryType = t; maxCount = c; }
    }

    return {
      id: cid(),
      centroid,
      radiusKm: 2,
      reports: clusterReports,
      severity,
      severityScore: Math.round(score),
      primaryType,
      title: `${primaryType.charAt(0).toUpperCase() + primaryType.slice(1)} cluster — ${clusterReports[0].locationName}`,
      lastUpdated: new Date().toISOString(),
    };
  });
}
