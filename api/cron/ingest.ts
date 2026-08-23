import type { VercelRequest, VercelResponse } from '@vercel/node';
import { insertReports, insertEvents } from '../../backend/src/repo.js';
import { supabase } from '../../backend/src/db.js';
import { fetchUSGSEarthquakes } from '../../backend/src/services/usgsService.js';
import { fetchGDACSEvents } from '../../backend/src/services/gdacsService.js';

// ============================================================
// CRISIS MAP — INGESTION ENDPOINT (Live data only)
// Fetches real disasters from USGS + GDACS, writes to Supabase.
// No mock data. No synthetic reports.
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
    // DB connectivity check
    const { error: dbErr } = await supabase.from('reports').select('id').limit(1);
    debug.dbConnected = !dbErr;
    if (dbErr) debug.dbError = dbErr.message;

    // --- USGS earthquake feed ---
    const usgs = await fetchUSGSEarthquakes();
    debug.usgsFetched = usgs.reports.length;
    if (usgs.reports.length > 0) {
      await insertReports(usgs.reports);
      await insertEvents(usgs.events);
      debug.usgsInserted = usgs.reports.length;
    }

    // --- GDACS global alerts (floods, cyclones, wildfires, droughts, earthquakes) ---
    const gdacs = await fetchGDACSEvents();
    debug.gdacsFetched = gdacs.reports.length;
    if (gdacs.reports.length > 0) {
      await insertReports(gdacs.reports);
      await insertEvents(gdacs.events);
      debug.gdacsInserted = gdacs.reports.length;
    }

    // Verify read-back
    const { count } = await supabase.from('reports').select('id', { count: 'exact', head: true });
    debug.totalReportsInDB = count;

    res.status(200).json({ ok: true, debug });
  } catch (err) {
    debug.fatalError = String(err);
    res.status(500).json({ ok: false, debug });
  }
}
