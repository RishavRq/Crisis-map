// ============================================================
// CRISIS MAP — FILTER BAR
// ============================================================

import { useCrisisStore } from '../store/crisisStore';
import type { Severity, DisasterType, ReportSource } from '../types';
import { SOURCE_CONFIG, SOURCE_FILTER_OPTIONS } from '../types';

const SEVERITIES: (Severity | 'all')[] = ['all', 'critical', 'high', 'moderate', 'low', 'info'];
const TYPES: (DisasterType | 'all')[] = [
  'all', 'earthquake', 'flood', 'fire', 'storm', 'tsunami',
  'landslide', 'industrial', 'medical', 'infrastructure',
];

export default function FilterBar() {
  const { severityFilter, typeFilter, sourceFilter, setSeverityFilter, setTypeFilter, setSourceFilter } = useCrisisStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <div className="filter-bar" id="filter-severity">
        {SEVERITIES.map(s => (
          <button
            key={s}
            className={`filter-chip ${severityFilter === s ? 'filter-chip--active' : ''}`}
            onClick={() => setSeverityFilter(s)}
          >
            {s === 'all' ? '◉ All' : s}
          </button>
        ))}
      </div>
      <div className="filter-bar" id="filter-type">
        {TYPES.map(t => (
          <button
            key={t}
            className={`filter-chip ${typeFilter === t ? 'filter-chip--active' : ''}`}
            onClick={() => setTypeFilter(t)}
          >
            {t === 'all' ? '◉ All' : t}
          </button>
        ))}
      </div>
      <div className="filter-bar" id="filter-source">
        {SOURCE_FILTER_OPTIONS.map(s => {
          const cfg = s === 'all' ? null : SOURCE_CONFIG[s as ReportSource];
          return (
            <button
              key={s}
              className={`filter-chip ${sourceFilter === s ? 'filter-chip--active' : ''}`}
              onClick={() => setSourceFilter(s)}
              style={cfg && sourceFilter === s ? { borderColor: cfg.color, color: cfg.color, background: `${cfg.color}18` } : undefined}
            >
              {s === 'all' ? '◉ All' : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: cfg?.color ?? '#666', flexShrink: 0,
                    }}
                  />
                  {cfg?.label ?? s}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
