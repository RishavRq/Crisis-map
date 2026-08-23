// ============================================================
// CRISIS MAP — MAP VIEW COMPONENT
// ============================================================

import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useCrisisStore, useFilteredReports } from '../store/crisisStore';
import { SEVERITY_CONFIG, DISASTER_ICONS, SOURCE_CONFIG } from '../types';
import { timeAgo } from '../utils/helpers';
import type { Report } from '../types';

// Dark map tile
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function MapController() {
  const map = useMap();
  const { mapCenter, mapZoom } = useCrisisStore();

  useEffect(() => {
    map.setView(mapCenter, mapZoom, { animate: true, duration: 0.8 });
  }, [map, mapCenter, mapZoom]);

  return null;
}

function ReportMarker({ report }: { report: Report }) {
  const { selectReport } = useCrisisStore();
  const config = SEVERITY_CONFIG[report.severity];

  return (
    <CircleMarker
      center={[report.location.lat, report.location.lng]}
      radius={report.severity === 'critical' ? 10 : report.severity === 'high' ? 8 : 6}
      pathOptions={{
        color: config.color,
        fillColor: config.color,
        fillOpacity: 0.6,
        weight: 2,
      }}
      eventHandlers={{
        click: () => selectReport(report),
      }}
    >
      <Popup>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', minWidth: '200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8b8fa8', fontSize: '10px' }}>
              {DISASTER_ICONS[report.type]} {report.type}
            </span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{
                padding: '1px 5px',
                fontSize: '9px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: SOURCE_CONFIG[report.source]?.color ?? '#666',
                border: `1px solid ${SOURCE_CONFIG[report.source]?.color ?? '#666'}`,
                lineHeight: '14px',
              }}>
                {SOURCE_CONFIG[report.source]?.abbr ?? report.source.toUpperCase()}
              </span>
              <span style={{
                padding: '1px 6px',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: config.color,
                border: `1px solid ${config.color}`,
              }}>
                {config.label}
              </span>
            </div>
          </div>
          <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px', color: '#e8eaf0' }}>
            {report.title}
          </div>
          <div style={{ color: '#8b8fa8', fontSize: '11px', marginBottom: '8px' }}>
            {report.locationName}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555876', fontSize: '10px' }}>
            <span>{timeAgo(report.reportedAt)}</span>
            <span>{report.reportCount} reports</span>
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
}

export default function CrisisMap() {
  const reports = useFilteredReports();
  const mapRef = useRef(null);

  const markers = useMemo(() =>
    reports.map(r => <ReportMarker key={r.id} report={r} />),
    [reports]
  );

  return (
    <div className="map-container" id="crisis-map">
      <MapContainer
        center={[20, 0]}
        zoom={3}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        ref={mapRef}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
        <MapController />
        {markers}
      </MapContainer>
    </div>
  );
}
