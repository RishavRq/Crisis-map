// ============================================================
// CRISIS MAP — REPORT SUBMISSION MODAL
// ============================================================

import { useState } from 'react';
import { useCrisisStore } from '../store/crisisStore';
import type { DisasterType, Severity, Report } from '../types';

const TYPES: DisasterType[] = [
  'earthquake', 'flood', 'fire', 'storm', 'tsunami',
  'landslide', 'industrial', 'medical', 'infrastructure', 'other',
];

const SEVERITIES: Severity[] = ['critical', 'high', 'moderate', 'low', 'info'];

export default function ReportModal() {
  const { isReportModalOpen, closeReportModal, addReport, addLiveEvent } = useCrisisStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<DisasterType>('earthquake');
  const [severity, setSeverity] = useState<Severity>('moderate');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [location, setLocation] = useState('');

  if (!isReportModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const report: Report = {
      id: `rpt-user-${Date.now().toString(36)}`,
      title: title || 'Untitled Report',
      description: description || 'No description provided.',
      type,
      severity,
      status: 'unverified',
      location: {
        lat: parseFloat(lat) || 37.7749 + (Math.random() - 0.5) * 0.1,
        lng: parseFloat(lng) || -122.4194 + (Math.random() - 0.5) * 0.1,
      },
      locationName: location || 'Unknown Location',
      reportedAt: new Date().toISOString(),
      reportedBy: 'User-Web',
      reportCount: 1,
      keywords: [type, severity],
      source: 'user',
    };
    addReport(report);
    addLiveEvent({
      id: `evt-${Date.now().toString(36)}`,
      message: `New ${severity} ${type} report submitted: ${title || 'Untitled'}`,
      type: 'report',
      severity,
      timestamp: new Date().toISOString(),
    });

    // Reset
    setTitle('');
    setDescription('');
    setType('earthquake');
    setSeverity('moderate');
    setLat('');
    setLng('');
    setLocation('');
    closeReportModal();
  };

  return (
    <div className="report-modal-overlay" id="report-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) closeReportModal();
    }}>
      <div className="report-modal" id="report-modal">
        <div className="report-modal__header">
          <h2 className="report-modal__title">Submit Report</h2>
          <button className="report-modal__close" onClick={closeReportModal} id="report-modal-close">
            ✕
          </button>
        </div>
        <form className="report-modal__body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="report-title">Incident Title</label>
            <input
              className="form-input"
              id="report-title"
              type="text"
              placeholder="Brief description of the incident..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="report-desc">Description</label>
            <textarea
              className="form-textarea"
              id="report-desc"
              placeholder="Detailed report of the situation on the ground..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="report-type">Disaster Type</label>
              <select
                className="form-select"
                id="report-type"
                value={type}
                onChange={e => setType(e.target.value as DisasterType)}
              >
                {TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="report-severity">Severity</label>
              <select
                className="form-select"
                id="report-severity"
                value={severity}
                onChange={e => setSeverity(e.target.value as Severity)}
              >
                {SEVERITIES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="report-location">Location Name</label>
            <input
              className="form-input"
              id="report-location"
              type="text"
              placeholder="City, Region, or Landmark"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="report-lat">Latitude</label>
              <input
                className="form-input"
                id="report-lat"
                type="number"
                step="any"
                placeholder="e.g. 37.7749"
                value={lat}
                onChange={e => setLat(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="report-lng">Longitude</label>
              <input
                className="form-input"
                id="report-lng"
                type="number"
                step="any"
                placeholder="e.g. -122.4194"
                value={lng}
                onChange={e => setLng(e.target.value)}
              />
            </div>
          </div>

          <button className="btn btn--primary btn--block" type="submit" id="report-submit">
            ▸ Submit Report
          </button>
        </form>
      </div>
    </div>
  );
}
