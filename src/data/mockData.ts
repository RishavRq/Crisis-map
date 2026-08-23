// ============================================================
// CRISIS MAP — MOCK DATA GENERATOR
// ============================================================

import type { Report, Cluster, LiveEvent, Severity, DisasterType, IncidentStatus } from '../types';

let _id = 0;
const uid = () => `rpt-${++_id}-${Date.now().toString(36)}`;
const cid = () => `cls-${++_id}-${Date.now().toString(36)}`;
const eid = () => `evt-${++_id}-${Date.now().toString(36)}`;

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const DISASTER_TYPES: DisasterType[] = [
  'earthquake', 'flood', 'fire', 'storm', 'tsunami',
  'landslide', 'industrial', 'medical', 'infrastructure', 'other',
];

const SEVERITIES: Severity[] = ['critical', 'high', 'moderate', 'low', 'info'];
const STATUSES: IncidentStatus[] = ['unverified', 'dispatched', 'resolved'];

const CITY_COORDS: { name: string; lat: number; lng: number }[] = [
  { name: 'San Francisco, CA', lat: 37.7749, lng: -122.4194 },
  { name: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437 },
  { name: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Mumbai, India', lat: 19.0760, lng: 72.8777 },
  { name: 'Istanbul, Turkey', lat: 41.0082, lng: 28.9784 },
  { name: 'Mexico City, Mexico', lat: 19.4326, lng: -99.1332 },
  { name: 'Jakarta, Indonesia', lat: -6.2088, lng: 106.8456 },
  { name: 'Manila, Philippines', lat: 14.5995, lng: 120.9842 },
  { name: 'Lima, Peru', lat: -12.0464, lng: -77.0428 },
  { name: 'Kathmandu, Nepal', lat: 27.7172, lng: 85.3240 },
  { name: 'Port-au-Prince, Haiti', lat: 18.5944, lng: -72.3074 },
  { name: 'Dhaka, Bangladesh', lat: 23.8103, lng: 90.4125 },
  { name: 'Nairobi, Kenya', lat: -1.2921, lng: 36.8219 },
  { name: 'Santiago, Chile', lat: -33.4489, lng: -70.6693 },
  { name: 'Tehran, Iran', lat: 35.6892, lng: 51.3890 },
  { name: 'Christchurch, NZ', lat: -43.5321, lng: 172.6362 },
  { name: 'Osaka, Japan', lat: 34.6937, lng: 135.5023 },
  { name: 'Taipei, Taiwan', lat: 25.0330, lng: 121.5654 },
  { name: 'Athens, Greece', lat: 37.9838, lng: 23.7275 },
  { name: 'Valparaiso, Chile', lat: -33.0472, lng: -71.6127 },
];

const REPORT_TITLES: Record<DisasterType, string[]> = {
  earthquake: [
    'Magnitude 5.2 earthquake felt across region',
    'Strong tremors reported, buildings shaking',
    'Seismic activity detected — possible aftershock',
    'Earthquake: structural damage reported',
  ],
  flood: [
    'Flash flooding in low-lying areas',
    'River levels rising rapidly — evacuation advised',
    'Water levels breaching containment walls',
    'Severe flooding: roads impassable',
  ],
  fire: [
    'Wildfire spreading rapidly — wind-driven',
    'Structure fire — multiple units involved',
    'Brush fire threatening residential zone',
    'Industrial fire: hazmat risk',
  ],
  storm: [
    'Category 3 hurricane making landfall',
    'Severe thunderstorm with tornado warning',
    'Tropical storm approaching coastline',
    'High winds causing power outages',
  ],
  tsunami: [
    'Tsunami warning issued after offshore quake',
    'Coastal surge detected — evacuate immediately',
    'Tsunami advisory: wave height 3m+',
  ],
  landslide: [
    'Landslide blocks major highway',
    'Mudslide after heavy rainfall',
    'Hillside collapse — homes at risk',
  ],
  industrial: [
    'Chemical spill at manufacturing plant',
    'Refinery explosion reported',
    'Gas leak detected in industrial zone',
  ],
  medical: [
    'Disease outbreak reported in district',
    'Mass casualty event — medical teams needed',
    'Hospital capacity exceeded',
  ],
  infrastructure: [
    'Bridge collapse during rush hour',
    'Major power grid failure',
    'Dam structural integrity compromised',
    'Communications blackout across region',
  ],
  other: [
    'Unidentified crisis event reported',
    'Multiple emergency calls from area',
    'Civil disturbance requiring response',
  ],
};

const KEYWORDS_MAP: Record<DisasterType, string[]> = {
  earthquake: ['tremor', 'seismic', 'aftershock', 'magnitude', 'collapse'],
  flood: ['flood', 'rising water', 'overflow', 'submerged', 'evacuation'],
  fire: ['fire', 'wildfire', 'blaze', 'smoke', 'evacuation'],
  storm: ['hurricane', 'tornado', 'wind', 'lightning', 'surge'],
  tsunami: ['tsunami', 'wave', 'coastal surge', 'evacuation'],
  landslide: ['landslide', 'mudslide', 'collapse', 'debris'],
  industrial: ['chemical', 'spill', 'explosion', 'hazmat', 'leak'],
  medical: ['outbreak', 'casualty', 'hospital', 'quarantine'],
  infrastructure: ['collapse', 'blackout', 'failure', 'dam', 'bridge'],
  other: ['emergency', 'crisis', 'unknown', 'disturbance'],
};

function generateReport(overrides?: Partial<Report>): Report {
  const type = overrides?.type ?? pick(DISASTER_TYPES);
  const city = pick(CITY_COORDS);
  const severity = overrides?.severity ?? pick(SEVERITIES);
  const offset = () => rand(-0.02, 0.02);
  const minsAgo = Math.floor(rand(1, 720));
  const date = new Date(Date.now() - minsAgo * 60_000);

  return {
    id: uid(),
    title: pick(REPORT_TITLES[type]),
    description: `Reports coming in from ${city.name}. Local authorities have been notified. Situation is developing. Multiple sources confirming activity in the area.`,
    type,
    severity,
    status: overrides?.status ?? pick(STATUSES),
    location: {
      lat: city.lat + offset(),
      lng: city.lng + offset(),
    },
    locationName: city.name,
    reportedAt: date.toISOString(),
    reportedBy: `Field-${Math.floor(rand(100, 999))}`,
    reportCount: Math.floor(rand(1, 25)),
    keywords: KEYWORDS_MAP[type].slice(0, Math.floor(rand(2, 5))),
    source: pick(['user', 'usgs', 'weather', 'mock'] as const),
    ...overrides,
  };
}

export function generateReports(count: number): Report[] {
  return Array.from({ length: count }, () => generateReport());
}

export function generateClusters(reports: Report[]): Cluster[] {
  // Simple spatial grouping: group by proximity to city center
  const groups = new Map<string, Report[]>();

  for (const r of reports) {
    // Round coords to ~2km grid
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
      return age < 3600_000; // less than 1 hour
    }).length;
    const score = totalWeight + recencyBoost * 3 + clusterReports.length * 2;

    let severity: Severity = 'info';
    if (score >= 60) severity = 'critical';
    else if (score >= 40) severity = 'high';
    else if (score >= 20) severity = 'moderate';
    else if (score >= 10) severity = 'low';

    // Primary type = most common
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
      lastUpdated: clusterReports.sort((a, b) =>
        new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
      )[0].reportedAt,
    };
  });
}

export function generateLiveEvents(count: number): LiveEvent[] {
  const events: LiveEvent[] = [];
  const types: LiveEvent['type'][] = ['report', 'status_change', 'cluster', 'alert'];
  const messages = [
    'New report submitted from field operative',
    'Cluster severity upgraded to HIGH',
    'Incident #247 status changed to DISPATCHED',
    'USGS data feed: M4.1 earthquake detected',
    'Weather alert: Flash flood warning issued',
    'Report verified by ground team',
    'New cluster formed: 5 reports within 2km',
    'Incident #189 resolved — all clear',
    'Multiple reports incoming from Jakarta sector',
    'Emergency response team deployed to Zone 4',
    'Satellite imagery confirms wildfire spread',
    'Communications restored in affected area',
    'Dam water levels exceeding threshold',
    'Evacuation order issued for coastal zones',
    'Medical teams en route to incident site',
  ];

  for (let i = 0; i < count; i++) {
    const minsAgo = Math.floor(rand(0, 120));
    events.push({
      id: eid(),
      message: pick(messages),
      type: pick(types),
      severity: pick(SEVERITIES),
      timestamp: new Date(Date.now() - minsAgo * 60_000).toISOString(),
    });
  }

  return events.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
