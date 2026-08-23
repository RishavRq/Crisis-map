// ============================================================
// CRISIS MAP — LIVE FEED
// ============================================================

import { useCrisisStore } from '../store/crisisStore';
import { timeAgo } from '../utils/helpers';
import { SEVERITY_CONFIG } from '../types';

export default function LiveFeed() {
  const { liveEvents } = useCrisisStore();

  return (
    <div className="dashboard__panel" id="live-feed-panel">
      <div className="panel__header">
        <div className="panel__title">Live Event Stream</div>
        <div className="panel__badge">REC</div>
      </div>
      <div className="panel__body" style={{ padding: 0 }}>
        {liveEvents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📡</div>
            <div className="empty-state__title">Waiting for events</div>
            <div className="empty-state__desc">Live event stream is currently quiet.</div>
          </div>
        ) : (
          liveEvents.map(event => (
            <div key={event.id} className="live-feed__item">
              <div
                className="live-feed__dot"
                style={{ background: SEVERITY_CONFIG[event.severity].color }}
              />
              <div className="live-feed__content">
                <div className="live-feed__text">{event.message}</div>
                <div className="live-feed__time">{timeAgo(event.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
