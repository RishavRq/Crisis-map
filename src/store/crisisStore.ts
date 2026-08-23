// ============================================================
// CRISIS MAP — ZUSTAND STORE (Vercel-compatible, HTTP polling)
// ============================================================

import { create } from 'zustand';
import type { Report, Cluster, LiveEvent, Severity, DisasterType, IncidentStatus, ReportSource } from '../types';
import { API_URL } from '../config';

const POLL_INTERVAL = 10_000; // 10 seconds

interface CrisisStore {
  // Data
  reports: Report[];
  clusters: Cluster[];
  liveEvents: LiveEvent[];

  // Filters
  severityFilter: Severity | 'all';
  typeFilter: DisasterType | 'all';
  statusFilter: IncidentStatus | 'all';
  sourceFilter: ReportSource | 'all';

  // UI State
  selectedReport: Report | null;
  selectedCluster: Cluster | null;
  isReportModalOpen: boolean;
  mapCenter: [number, number];
  mapZoom: number;

  // Connection State
  isConnected: boolean;
  _pollTimer: ReturnType<typeof setInterval> | null;

  // Actions
  setSeverityFilter: (f: Severity | 'all') => void;
  setTypeFilter: (f: DisasterType | 'all') => void;
  setStatusFilter: (f: IncidentStatus | 'all') => void;
  setSourceFilter: (f: ReportSource | 'all') => void;
  selectReport: (r: Report | null) => void;
  selectCluster: (c: Cluster | null) => void;
  openReportModal: () => void;
  closeReportModal: () => void;
  setMapView: (center: [number, number], zoom: number) => void;

  // App Actions
  addReport: (r: Report) => void;
  updateReportStatus: (id: string, status: IncidentStatus) => void;
  addLiveEvent: (e: LiveEvent) => void;
  refreshData: () => void;
  startPolling: () => void;
  stopPolling: () => void;
}

/** Fetch JSON from the API with error handling */
async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** POST JSON to the API */
async function apiPost(path: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const useCrisisStore = create<CrisisStore>((set, get) => ({
  // Initial Data
  reports: [],
  clusters: [],
  liveEvents: [],

  // Default Filters
  severityFilter: 'all',
  typeFilter: 'all',
  statusFilter: 'all',
  sourceFilter: 'all',

  // UI State
  selectedReport: null,
  selectedCluster: null,
  isReportModalOpen: false,
  mapCenter: [20, 0],
  mapZoom: 3,

  // Connection State
  isConnected: false,
  _pollTimer: null,

  // Actions
  setSeverityFilter: (f) => set({ severityFilter: f }),
  setTypeFilter: (f) => set({ typeFilter: f }),
  setStatusFilter: (f) => set({ statusFilter: f }),
  setSourceFilter: (f) => set({ sourceFilter: f }),
  selectReport: (r) => set({ selectedReport: r }),
  selectCluster: (c) => set({ selectedCluster: c }),
  openReportModal: () => set({ isReportModalOpen: true }),
  closeReportModal: () => set({ isReportModalOpen: false }),
  setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),

  addReport: async (r) => {
    const ok = await apiPost('/api/submit', r);
    if (ok) {
      // Optimistic update — add to local state immediately
      set(s => ({ reports: [r, ...s.reports].slice(0, 500) }));
    }
  },

  updateReportStatus: async (id, status) => {
    const ok = await apiPost('/api/status', { id, status });
    if (ok) {
      // Optimistic update
      set(s => ({
        reports: s.reports.map(r =>
          r.id === id ? { ...r, status } : r
        ),
      }));
    }
  },

  addLiveEvent: (_e) => {
    // Events come via polling, this is a no-op
  },

  refreshData: async () => {
    const [reports, clusters, liveEvents] = await Promise.all([
      apiFetch<Report[]>('/api/reports?limit=500'),
      apiFetch<Cluster[]>('/api/clusters'),
      apiFetch<LiveEvent[]>('/api/events?limit=50'),
    ]);

    set({
      reports: reports ?? [],
      clusters: clusters ?? [],
      liveEvents: liveEvents ?? [],
      isConnected: true,
    });
  },

  startPolling: () => {
    const { _pollTimer, refreshData } = get();
    if (_pollTimer) return; // already polling

    // Initial fetch
    refreshData();

    // Poll at interval
    const timer = setInterval(refreshData, POLL_INTERVAL);
    set({ _pollTimer: timer });
  },

  stopPolling: () => {
    const { _pollTimer } = get();
    if (_pollTimer) {
      clearInterval(_pollTimer);
      set({ _pollTimer: null, isConnected: false });
    }
  },
}));

// Derived selectors
export const useFilteredReports = () => {
  const { reports, severityFilter, typeFilter, statusFilter, sourceFilter } = useCrisisStore();
  return reports.filter(r => {
    if (severityFilter !== 'all' && r.severity !== severityFilter) return false;
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
    return true;
  });
};

export const useFilteredClusters = () => {
  const { clusters, severityFilter, typeFilter } = useCrisisStore();
  return clusters.filter(c => {
    if (severityFilter !== 'all' && c.severity !== severityFilter) return false;
    if (typeFilter !== 'all' && c.primaryType !== typeFilter) return false;
    return true;
  });
};
