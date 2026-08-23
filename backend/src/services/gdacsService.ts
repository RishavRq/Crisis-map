import { Report, LiveEvent, Severity, DisasterType } from '../types';

// ============================================================
// GDACS API SERVICE
// Global Disaster Alert and Coordination System (UN/EU)
// Public API — no authentication required.
// https://www.gdacs.org/gdacsapi/api
// ============================================================

const GDACS_BASE = 'https://www.gdacs.org/gdacsapi/api';
const EVENT_TYPES = 'EQ,TC,FL,VO,DR,WF';

interface GDACSFeature {
  type: 'Feature';
  bbox: number[] | null;
  geometry: {
    type: string;
    coordinates: number[];
  };
  properties: {
    eventtype: string;
    eventid: number;
    episodeid: number;
    eventname: string;
    name: string;
    description: string;
    htmldescription: string;
    alertlevel: string;       // 'Red' | 'Orange' | 'Green'
    alertscore: number;       // 0–3
    episodealertlevel: string;
    episodealertscore: number;
    country: string;
    iso3: string;
    fromdate: string;
    todate: string;
    datemodified: string;
    source: string;
    url: {
      geometry: string;
      report: string;
      details: string;
    };
    severitydata?: {
      severity: number;
      severitytext: string;
      severityunit: string;
    };
    affectedcountries?: Array<{
      iso2: string;
      iso3: string;
      countryname: string;
    }>;
  };
}

interface GDACSResponse {
  type: 'FeatureCollection';
  features: GDACSFeature[];
}

/** Map GDACS event type codes to our DisasterType */
function mapDisasterType(gdacsType: string): DisasterType {
  const map: Record<string, DisasterType> = {
    EQ: 'earthquake',
    TC: 'storm',       // Tropical Cyclone → storm
    FL: 'flood',
    VO: 'other',       // Volcano → no dedicated type yet
    DR: 'other',       // Drought → no dedicated type yet
    WF: 'fire',        // Wildfire → fire
  };
  return map[gdacsType] ?? 'other';
}

/** Map GDACS alert level to our Severity */
function mapSeverity(alertLevel: string, alertScore: number, gdacsType: string): Severity {
  // Use episode-level score when available for more precision
  if (alertLevel === 'Red' || alertScore >= 2.5) {
    return 'critical';
  }
  if (alertLevel === 'Orange' || alertScore >= 1.5) {
    // For earthquakes, differentiate based on magnitude context
    if (gdacsType === 'EQ' && alertScore >= 2.0) return 'high';
    return 'moderate';
  }
  // Green
  if (alertScore >= 1.0) return 'low';
  return 'info';
}

/** Extract magnitude-like severity info from severitydata */
function parseSeverityText(severitydata?: { severity: number; severitytext: string; severityunit: string }): string {
  if (!severitydata) return '';
  if (severitydata.severityunit === 'M') {
    return `Magnitude ${severitydata.severity} — ${severitydata.severitytext}`;
  }
  if (severitydata.severityunit === 'km/h') {
    return `Wind speed ${severitydata.severity} km/h — ${severitydata.severitytext}`;
  }
  if (severitydata.severityunit === 'ha') {
    return `Affected area ${severitydata.severity.toLocaleString()} ha — ${severitydata.severitytext}`;
  }
  if (severitydata.severityunit === 'km2') {
    return `Affected area ${severitydata.severity.toLocaleString()} km² — ${severitydata.severitytext}`;
  }
  return severitydata.severitytext || '';
}

let lastFetchTime = 0;

export async function fetchGDACSEvents(): Promise<{ reports: Report[]; events: LiveEvent[] }> {
  try {
    const url = `${GDACS_BASE}/events/geteventlist/SEARCH?eventType=${EVENT_TYPES}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GDACS HTTP ${response.status}: ${response.statusText}`);

    const data = (await response.json()) as GDACSResponse;
    const newReports: Report[] = [];
    const newEvents: LiveEvent[] = [];

    for (const feature of (data.features ?? []).reverse()) {
      const props = feature.properties;
      const eventTime = new Date(props.fromdate).getTime();

      // Only ingest events we haven't seen yet (or newly modified)
      const modifiedTime = new Date(props.datemodified).getTime();
      if (modifiedTime <= lastFetchTime) continue;

      const coords = feature.geometry?.coordinates ?? [0, 0];
      const lng = coords[0];
      const lat = coords[1];

      // Skip events with no valid coordinates
      if (lat === 0 && lng === 0) continue;

      const severity = mapSeverity(props.alertlevel, props.alertscore, props.eventtype);
      const disasterType = mapDisasterType(props.eventtype);

      const severityDetail = parseSeverityText(props.severitydata);
      const affectedCountries = props.affectedcountries?.map(c => c.countryname).join(', ') || props.country;

      const report: Report = {
        id: `gdacs-${props.eventtype}-${props.eventid}-${props.episodeid}`,
        title: props.name || `GDACS ${props.eventtype} Alert`,
        description: [
          props.htmldescription || props.description,
          severityDetail ? `Severity: ${severityDetail}` : '',
          `Countries affected: ${affectedCountries}`,
          `Alert level: ${props.alertlevel} (score ${props.alertscore})`,
          `Source: ${props.source || 'GDACS'}`,
          `Report: ${props.url.report}`,
        ].filter(Boolean).join('\n'),
        type: disasterType,
        severity,
        status: 'unverified',
        location: { lat, lng },
        locationName: affectedCountries,
        reportedAt: new Date(eventTime || modifiedTime).toISOString(),
        reportedBy: `GDACS (${props.source || 'UN/EU'})`,
        reportCount: 1,
        keywords: [
          props.eventtype.toLowerCase(),
          severity,
          ...((props.affectedcountries ?? []).map(c => c.countryname)),
        ].filter(Boolean),
        source: 'gdacs',
      };

      const event: LiveEvent = {
        id: `evt-gdacs-${props.eventtype}-${props.eventid}-${props.episodeid}`,
        message: `GDACS ${props.alertlevel} Alert: ${props.name} (${affectedCountries})`,
        type: 'alert',
        severity,
        timestamp: new Date(modifiedTime).toISOString(),
      };

      newReports.push(report);
      newEvents.push(event);
    }

    if (newReports.length > 0) {
      lastFetchTime = Date.now();
      console.log(`GDACS: Ingested ${newReports.length} new event(s)`);
    }

    return { reports: newReports, events: newEvents };
  } catch (error) {
    console.error('GDACS fetch error:', error);
    return { reports: [], events: [] };
  }
}
