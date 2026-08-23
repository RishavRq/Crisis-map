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
