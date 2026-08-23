import type { VercelRequest, VercelResponse } from '@vercel/node';
import { insertReports, insertEvents, listReports } from '../../backend/src/repo.js';
import { fetchUSGSEarthquakes } from '../../backend/src/services/usgsService.js';
import { fetchGDACSEvents } from '../../backend/src/services/gdacsService.js';
import { generateReport, generateLiveEvent } from '../../backend/src/services/mockGenerator.js';
import type { Report } from '../../backend/src/types.js';

// ============================================================
// CRISIS MAP — VERCEL CRON INGESTION WORKER
// Runs every minute via Vercel Cron Jobs (vercel.json → crons).
// Fetches from USGS + GDACS, writes to Supabase.
// Also seeds 50 mock reports on first run if DB is empty.
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify this is a genuine Vercel cron request
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results: string[] = [];

  try {
    // --- Seed mock data if DB is empty ---
    const existing = await listReports(1);
    if (existing.length === 0) {
      const mockReports: Report[] = [];
      const mockEvents = [];
      for (let i = 0; i < 50; i++) {
        const r = generateReport();
        mockReports.push(r);
        mockEvents.push(generateLiveEvent(r));
      }
      await insertReports(mockReports);
      await insertEvents(mockEvents);
      results.push(`Seeded ${mockReports.length} mock reports`);
    }

    // --- USGS earthquake feed ---
    const usgs = await fetchUSGSEarthquakes();
    if (usgs.reports.length > 0) {
      await insertReports(usgs.reports);
      await insertEvents(usgs.events);
      results.push(`USGS: +${usgs.reports.length} reports`);
    }

    // --- GDACS global alerts ---
    const gdacs = await fetchGDACSEvents();
    if (gdacs.reports.length > 0) {
      await insertReports(gdacs.reports);
      await insertEvents(gdacs.events);
      results.push(`GDACS: +${gdacs.reports.length} reports`);
    }

    // --- Mock generator (1 per minute in cron instead of 15s local) ---
    const mockReport = generateReport();
    const mockEvent = generateLiveEvent(mockReport);
    await insertReports([mockReport]);
    await insertEvents([mockEvent]);
    results.push('Mock: +1 report');

    res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      ingested: results,
    });
  } catch (err) {
    console.error('[cron/ingest] Error:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
}
