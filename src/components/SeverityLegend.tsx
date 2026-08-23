// ============================================================
// CRISIS MAP — SEVERITY LEGEND OVERLAY
// ============================================================

import { SEVERITY_CONFIG } from '../types';
import type { Severity } from '../types';

const ORDER: Severity[] = ['critical', 'high', 'moderate', 'low', 'info'];

export default function SeverityLegend() {
  return (
    <div className="severity-legend" id="severity-legend">
      <div className="severity-legend__title">Severity Index</div>
      {ORDER.map(s => (
        <div className="severity-legend__item" key={s}>
          <span
            className="severity-legend__dot"
            style={{ background: SEVERITY_CONFIG[s].color }}
          />
          <span>{SEVERITY_CONFIG[s].label}</span>
        </div>
      ))}
    </div>
  );
}
