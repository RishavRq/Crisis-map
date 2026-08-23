// ============================================================
// CRISIS MAP — TYPE DEFINITIONS
// ============================================================

export type Severity = 'critical' | 'high' | 'moderate' | 'low' | 'info';
export type IncidentStatus = 'unverified' | 'dispatched' | 'resolved';
export type DisasterType =
  | 'earthquake'
  | 'flood'
  | 'fire'
  | 'storm'
  | 'tsunami'
  | 'landslide'
  | 'industrial'
  | 'medical'
  | 'infrastructure'
  | 'other';

export interface GeoCoord {
  lat: number;
  lng: number;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  type: DisasterType;
  severity: Severity;
  status: IncidentStatus;
  location: GeoCoord;
  locationName: string;
  reportedAt: string;       // ISO timestamp
  reportedBy: string;
  reportCount: number;       // how many reports merged into this
  keywords: string[];
  source: 'user' | 'usgs' | 'weather' | 'gdacs' | 'mock';
}

export interface Cluster {
  id: string;
  centroid: GeoCoord;
  radiusKm: number;
  reports: Report[];
  severity: Severity;
  severityScore: number;
  primaryType: DisasterType;
  title: string;
  lastUpdated: string;
}

export interface LiveEvent {
  id: string;
  message: string;
  type: 'report' | 'status_change' | 'cluster' | 'alert';
  severity: Severity;
  timestamp: string;
}

export const SEVERITY_CONFIG: Record<Severity, { label: string; color: string; order: number }> = {
  critical: { label: 'Critical', color: '#ff2d2d', order: 0 },
  high:     { label: 'High',     color: '#ff6b35', order: 1 },
  moderate: { label: 'Moderate', color: '#ffc107', order: 2 },
  low:      { label: 'Low',      color: '#4ecdc4', order: 3 },
  info:     { label: 'Info',     color: '#6c7ce0', order: 4 },
};

export const STATUS_CONFIG: Record<IncidentStatus, { label: string; color: string }> = {
  unverified: { label: 'Unverified', color: '#ff6b35' },
  dispatched: { label: 'Dispatched', color: '#6c7ce0' },
  resolved:   { label: 'Resolved',   color: '#2ecc71' },
};

export type ReportSource = 'user' | 'usgs' | 'weather' | 'gdacs' | 'mock';

export const SOURCE_CONFIG: Record<ReportSource, { label: string; color: string; abbr: string }> = {
  usgs:    { label: 'USGS',    color: '#f59e0b', abbr: 'US' },
  gdacs:   { label: 'GDACS',   color: '#3b82f6', abbr: 'GD' },
  user:    { label: 'User',    color: '#a855f7', abbr: 'UR' },
  weather: { label: 'Weather', color: '#06b6d4', abbr: 'WX' },
  mock:    { label: 'Mock',    color: '#6b7280', abbr: 'MK' },
};

export const SOURCE_FILTER_OPTIONS: (ReportSource | 'all')[] = [
  'all', 'gdacs', 'usgs', 'user', 'mock',
];

export const DISASTER_ICONS: Record<DisasterType, string> = {
  earthquake:     '🔴',
  flood:          '🌊',
  fire:           '🔥',
  storm:          '⛈️',
  tsunami:        '🌊',
  landslide:      '⛰️',
  industrial:     '🏭',
  medical:        '🏥',
  infrastructure: '🏗️',
  other:          '⚠️',
};
