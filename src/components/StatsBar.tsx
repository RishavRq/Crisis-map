// ============================================================
// CRISIS MAP — STATS BAR OVERLAY
// ============================================================

import { useCrisisStore } from '../store/crisisStore';

export default function StatsBar() {
  const { reports, clusters } = useCrisisStore();

  const activeIncidents = reports.filter(r => r.status !== 'resolved').length;
  const criticalCount = reports.filter(r => r.severity === 'critical').length;
  const unresolvedCount = reports.filter(r => r.status === 'unverified').length;

  return (
    <div className="stats-bar" id="stats-bar">
      <div className="stat-card">
        <div className="stat-card__label">Total Reports</div>
        <div className="stat-card__value">{reports.length}</div>
      </div>
      <div className="stat-card">
        <div className="stat-card__label">Active Clusters</div>
        <div className="stat-card__value">{clusters.length}</div>
      </div>
      <div className="stat-card">
        <div className="stat-card__label">Critical</div>
        <div className="stat-card__value stat-card__value--accent">{criticalCount}</div>
      </div>
      <div className="stat-card">
        <div className="stat-card__label">Unverified</div>
        <div className="stat-card__value stat-card__value--warning">{unresolvedCount}</div>
      </div>
      <div className="stat-card">
        <div className="stat-card__label">Active</div>
        <div className="stat-card__value stat-card__value--success">{activeIncidents}</div>
      </div>
    </div>
  );
}
