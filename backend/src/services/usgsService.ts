import { Report, LiveEvent, Severity } from '../types';

interface USGSFeature {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    updated: number;
    url: string;
    title: string;
    status: string;
  };
  geometry: {
    coordinates: [number, number, number]; // lng, lat, depth
  };
}

interface USGSGeoJSON {
  features: USGSFeature[];
}

let lastIngestedTime = 0;

export async function fetchUSGSEarthquakes(): Promise<{ reports: Report[], events: LiveEvent[] }> {
  try {
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
    if (!response.ok) throw new Error(`USGS HTTP Error: ${response.status}`);
    
    const data = (await response.json()) as USGSGeoJSON;
    const newReports: Report[] = [];
    const newEvents: LiveEvent[] = [];

    // Process newest first
    for (const feature of data.features.reverse()) {
      if (feature.properties.time > lastIngestedTime) {
        lastIngestedTime = feature.properties.time;
        
        let severity: Severity = 'info';
        const mag = feature.properties.mag;
        if (mag >= 7.0) severity = 'critical';
        else if (mag >= 5.5) severity = 'high';
        else if (mag >= 4.0) severity = 'moderate';
        else if (mag >= 2.5) severity = 'low';

        const report: Report = {
          id: `usgs-${feature.id}`,
          title: feature.properties.title,
          description: `USGS automated earthquake detection. Magnitude ${mag}. Status: ${feature.properties.status}. More info: ${feature.properties.url}`,
          type: 'earthquake',
          severity,
          status: 'unverified',
          location: {
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0]
          },
          locationName: feature.properties.place || 'Unknown Location',
          reportedAt: new Date(feature.properties.time).toISOString(),
          reportedBy: 'USGS Ingestion Engine',
          reportCount: 1,
          keywords: ['earthquake', 'seismic', 'usgs', `mag${mag}`],
          source: 'usgs'
        };

        const event: LiveEvent = {
          id: `evt-usgs-${feature.id}`,
          message: `USGS Ingested: ${report.title}`,
          type: 'report',
          severity: report.severity,
          timestamp: report.reportedAt,
        };

        newReports.push(report);
        newEvents.push(event);
      }
    }
    
    return { reports: newReports, events: newEvents };
  } catch (error) {
    console.error('Error fetching from USGS:', error);
    return { reports: [], events: [] };
  }
}
