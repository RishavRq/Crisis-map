// ============================================================
// CRISIS MAP — TOP NAVIGATION BAR
// ============================================================

import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { localClock } from '../utils/helpers';

export default function TopNav() {
  const [clock, setClock] = useState(localClock());
  const location = useLocation();

  useEffect(() => {
    const interval = setInterval(() => setClock(localClock()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) =>
    location.pathname === path ? 'nav-link nav-link--active' : 'nav-link';

  return (
    <nav className="top-nav" id="top-nav">
      <div className="nav-brand">
        <div className="nav-brand__icon">⚡</div>
        <span className="nav-brand__text">Crisis Map</span>
        <span className="nav-brand__tag">v1.0</span>
      </div>

      <div className="nav-links">
        <NavLink to="/" className={isActive('/')} id="nav-link-map">
          ◉ Map
        </NavLink>
        <NavLink to="/dashboard" className={isActive('/dashboard')} id="nav-link-dashboard">
          ◫ Dashboard
        </NavLink>
      </div>

      <div className="nav-status">
        <div className="nav-status__indicator">
          <span className="nav-status__dot" />
          <span>LIVE</span>
        </div>
        <span className="nav-clock">{clock} UTC</span>
      </div>
    </nav>
  );
}
