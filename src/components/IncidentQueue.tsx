// ============================================================
// CRISIS MAP — INCIDENT QUEUE
// ============================================================

import { useCrisisStore, useFilteredReports } from '../store/crisisStore';
import { SEVERITY_CONFIG, STATUS_CONFIG, DISASTER_ICONS, SOURCE_CONFIG } from '../types';
import { timeAgo } from '../utils/helpers';
import type { Report } from '../types';

function IncidentCard({ report }: { report: Report }) {
  const { updateReportStatus, addLiveEvent } = useCrisisStore();

  const handleStatusChange = (e: React.MouseEvent, newStatus: Report['status']) => {
    e.stopPropagation();
    updateReportStatus(report.id, newStatus);
    addLiveEvent({
      id: `evt-${Date.now().toString(36)}`,
      message: `Incident updated: ${report.title} status changed to ${newStatus.toUpperCase()}`,
      type: 'status_change',
      severity: 'info',
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className={`incident-card incident-card--${report.severity}`}>
      <div className="incident-card__top">
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="incident-card__type">
            {DISASTER_ICONS[report.type]} {report.type}
          </span>
          <span className={`incident-card__severity incident-card__severity--${report.severity}`}>
            {SEVERITY_CONFIG[report.severity].label}
          </span>
          <span
            className="source-badge"
            title={SOURCE_CONFIG[report.source]?.label ?? report.source}
            style={{
              padding: '1px 5px',
              fontSize: '9px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: SOURCE_CONFIG[report.source]?.color ?? '#666',
              border: `1px solid ${SOURCE_CONFIG[report.source]?.color ?? '#666'}`,
              lineHeight: '14px',
              flexShrink: 0,
            }}>
            {SOURCE_CONFIG[report.source]?.abbr ?? report.source.toUpperCase()}
          </span>
        </div>
        <span className={`status-badge status-badge--${report.status}`}>
          {STATUS_CONFIG[report.status].label}
        </span>
      </div>

      <div className="incident-card__title">{report.title}</div>
      <div className="incident-card__desc">{report.description}</div>

      <div className="incident-card__meta">
        <div className="incident-card__meta-item">
          <span>📍</span> {report.locationName}
        </div>
        <div className="incident-card__meta-item">
          <span>⏱️</span> {timeAgo(report.reportedAt)}
        </div>
        <div className="incident-card__meta-item">
          <span>👥</span> {report.reportCount} sources
        </div>
      </div>

      <div className="incident-card__actions">
        {report.status === 'unverified' && (
          <button
            className="btn btn--primary btn--sm"
            onClick={(e) => handleStatusChange(e, 'dispatched')}
          >
            ▸ Dispatch Unit
          </button>
        )}
        {report.status === 'dispatched' && (
          <button
            className="btn btn--ghost btn--sm"
            style={{ color: 'var(--success)' }}
            onClick={(e) => handleStatusChange(e, 'resolved')}
          >
            ✓ Mark Resolved
          </button>
        )}
      </div>
    </div>
  );
}

export default function IncidentQueue() {
  const reports = useFilteredReports();

  return (
    <div className="dashboard__panel" id="incident-queue-panel">
      <div className="panel__header">
        <div className="panel__title">Incident Verification Queue</div>
        <div className="panel__badge">{reports.length}</div>
      </div>
      <div className="panel__body">
        {reports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">✓</div>
            <div className="empty-state__title">Queue Empty</div>
            <div className="empty-state__desc">No incidents match current filters.</div>
          </div>
        ) : (
          reports.map(r => <IncidentCard key={r.id} report={r} />)
        )}
      </div>
    </div>
  );
}
