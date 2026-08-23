// ============================================================
// CRISIS MAP — PUBLIC MAP PAGE
// ============================================================

import CrisisMap from '../components/CrisisMap';
import StatsBar from '../components/StatsBar';
import SeverityLegend from '../components/SeverityLegend';
import FilterBar from '../components/FilterBar';
import ReportModal from '../components/ReportModal';
import { useCrisisStore } from '../store/crisisStore';

export default function PublicMapPage() {
  const { openReportModal } = useCrisisStore();

  return (
    <>
      <div className="map-overlay map-overlay--top-left">
        <StatsBar />
      </div>

      <div className="map-overlay map-overlay--bottom-left">
        <SeverityLegend />
      </div>

      <div className="map-overlay map-overlay--top-right">
        <FilterBar />
      </div>

      <CrisisMap />

      <button
        className="fab"
        onClick={openReportModal}
        title="Submit Incident Report"
        id="fab-report"
      >
        +
      </button>

      <ReportModal />
    </>
  );
}
