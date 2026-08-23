// ============================================================
// CRISIS MAP — APP ENTRY
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useCrisisStore } from './store/crisisStore';
import TopNav from './components/TopNav';
import PublicMapPage from './pages/PublicMap';
import DashboardPage from './pages/Dashboard';
import './App.css';

export default function App() {
  const { startPolling, stopPolling } = useCrisisStore();

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <TopNav />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<PublicMapPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
