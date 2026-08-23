import type { VercelRequest, VercelResponse } from '@vercel/node';
import { insertReports, insertEvents, listReports } from '../../backend/src/repo.js';
import { supabase } from '../../backend/src/db.js';
import { fetchUSGSEarthquakes } from '../../backend/src/services/usgsService.js';
import { fetchGDACSEvents } from '../../backend/src/services/gdacsService.js';
import { generateReport, generateLiveEvent } from '../../backend/src/services/mockGenerator.js';
import type { Report } from '../../backend/src/types.js';

// ============================================================
// CRISIS MAP — INGESTION ENDPOINT
// Called by external scheduler (cron-job.org, cronitor, etc.)
// or manually: curl https://your-app.vercel.app/api/cron/ingest?key=YOUR_SECRET
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const queryKey = req.query.key as string | undefined;
    const headerKey = req.headers.authorization?.replace('Bearer ', '');
    if (queryKey !== secret && headerKey !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const debug: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    supabaseUrl: process.env.SUPABASE_URL ? 'set' : 'MISSING',
    supabaseKey: process.env.SUPABASE_ANON_KEY ? 'set' : 'MISSING',
  };

  try {
    // --- DB connectivity check ---
    const { error: dbErr } = await supabase.from('reports').select('id').limit(1);
    debug.dbConnected = !dbErr;
    if (dbErr) {
      debug.dbError = dbErr.message;
    }

    // --- Seed mock data if DB is empty ---
    const existing = await listReports(1);
    debug.existingReports = existing.length;

    if (existing.length === 0) {
      const mockReports: Report[] = [];
      const mockEvents = [];
      for (let i = 0; i < 50; i++) {
        const r = generateReport();
        mockReports.push(r);
        mockEvents.push(generateLiveEvent(r));
      }
      const { error: seedErr } = await supabase.from('reports').upsert(
        mockReports.map(r => ({
          id: r.id, title: r.title, description: r.description,
          type: r.type, severity: r.severity, status: r.status,
          location: `SRID=4326;POINT(${r.location.lng} ${r.location.lat})`,
          location_name: r.locationName, reported_at: r.reportedAt,
          reported_by: r.reportedBy, report_count: r.reportCount,
          keywords: r.keywords, source: r.source,
        })),
        { onConflict: 'id' }
      );
      debug.seedError = seedErr?.message ?? null;
      debug.seeded = mockReports.length;
    }

    // --- USGS earthquake feed ---
    const usgs = await fetchUSGSEarthquakes();
    debug.usgsFetched = usgs.reports.length;
    if (usgs.reports.length > 0) {
      const { error: usgsErr } = await supabase.from('reports').upsert(
        usgs.reports.map(r => ({
          id: r.id, title: r.title, description: r.description,
          type: r.type, severity: r.severity, status: r.status,
          location: `SRID=4326;POINT(${r.location.lng} ${r.location.lat})`,
          location_name: r.locationName, reported_at: r.reportedAt,
          reported_by: r.reportedBy, report_count: r.reportCount,
          keywords: r.keywords, source: r.source,
        })),
        { onConflict: 'id' }
      );
      debug.usgsWriteError = usgsErr?.message ?? null;
    }

    // --- GDACS global alerts ---
    const gdacs = await fetchGDACSEvents();
    debug.gdacsFetched = gdacs.reports.length;
    if (gdacs.reports.length > 0) {
      const { error: gdacsErr } = await supabase.from('reports').upsert(
        gdacs.reports.map(r => ({
          id: r.id, title: r.title, description: r.description,
          type: r.type, severity: r.severity, status: r.status,
          location: `SRID=4326;POINT(${r.location.lng} ${r.location.lat})`,
          location_name: r.locationName, reported_at: r.reportedAt,
          reported_by: r.reportedBy, report_count: r.reportCount,
          keywords: r.keywords, source: r.source,
        })),
        { onConflict: 'id' }
      );
      debug.gdacsWriteError = gdacsErr?.message ?? null;
    }

    // --- Mock generator ---
    const mockReport = generateReport();
    const { error: mockErr } = await supabase.from('reports').upsert({
      id: mockReport.id, title: mockReport.title, description: mockReport.description,
      type: mockReport.type, severity: mockReport.severity, status: mockReport.status,
      location: `SRID=4326;POINT(${mockReport.location.lng} ${mockReport.location.lat})`,
      location_name: mockReport.locationName, reported_at: mockReport.reportedAt,
      reported_by: mockReport.reportedBy, report_count: mockReport.reportCount,
      keywords: mockReport.keywords, source: mockReport.source,
    }, { onConflict: 'id' });
    debug.mockWriteError = mockErr?.message ?? null;

    // --- Verify read-back ---
    const after = await listReports(1);
    debug.readBackCount = after.length;

    res.status(200).json({ ok: true, debug });
  } catch (err) {
    debug.fatalError = String(err);
    res.status(500).json({ ok: false, debug });
  }
}
