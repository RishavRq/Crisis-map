// ============================================================
// CRISIS MAP — DASHBOARD PAGE
// ============================================================

import { useCrisisStore } from '../store/crisisStore';
import IncidentQueue from '../components/IncidentQueue';
import LiveFeed from '../components/LiveFeed';

export default function DashboardPage() {
  const { reports, clusters, refreshData } = useCrisisStore();

  const criticalCount = reports.filter(r => r.severity === 'critical').length;
  const activeCount = reports.filter(r => r.status !== 'resolved').length;

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div className="dashboard__header-title">
          Dispatcher Dashboard
        </div>
        <div className="dashboard__header-stats">
          <div className="dashboard__header-stat">
            <span className="dashboard__header-stat-label">Active Incidents</span>
            <span className="dashboard__header-stat-value" style={{ color: 'var(--success)' }}>
              {activeCount}
            </span>
          </div>
          <div className="dashboard__header-stat">
            <span className="dashboard__header-stat-label">Critical Alerts</span>
            <span className="dashboard__header-stat-value" style={{ color: 'var(--accent)' }}>
              {criticalCount}
            </span>
          </div>
          <div className="dashboard__header-stat">
            <span className="dashboard__header-stat-label">Identified Clusters</span>
            <span className="dashboard__header-stat-value" style={{ color: 'var(--text-primary)' }}>
              {clusters.length}
            </span>
          </div>
          <button className="btn btn--primary btn--sm" onClick={refreshData}>
            ↻ Sync Now
          </button>
        </div>
      </div>

      <IncidentQueue />
      <LiveFeed />
    </div>
  );
}
