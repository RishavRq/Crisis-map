import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../backend/src/db.js';

// ============================================================
// PURGE MOCK DATA — removes all mock reports from the DB
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const queryKey = req.query.key as string | undefined;
    if (queryKey !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    // Delete mock reports (IDs start with "rpt-mock-")
    const { count: mockDeleted } = await supabase
      .from('reports')
      .delete({ count: 'exact' })
      .like('id', 'rpt-mock-%');

    // Delete associated mock events
    const { count: eventsDeleted } = await supabase
      .from('live_events')
      .delete({ count: 'exact' })
      .like('id', 'evt-mock-%');

    // Count remaining
    const { count: remaining } = await supabase
      .from('reports')
      .select('id', { count: 'exact', head: true });

    res.status(200).json({
      ok: true,
      mockReportsDeleted: mockDeleted ?? 0,
      mockEventsDeleted: eventsDeleted ?? 0,
      totalReportsRemaining: remaining ?? 0,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
}
