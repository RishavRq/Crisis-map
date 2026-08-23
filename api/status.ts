import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updateReportStatus, insertEvent } from '../backend/src/repo.js';
import type { LiveEvent } from '../backend/src/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, status } = req.body ?? {};
    if (!id || !status) {
      return res.status(400).json({ error: 'Missing required fields: id, status' });
    }

    const validStatuses = ['unverified', 'dispatched', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const report = await updateReportStatus(id, status);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const event: LiveEvent = {
      id: `evt-status-${Date.now()}`,
      message: `Incident updated: ${report.title} status changed to ${status.toUpperCase()}`,
      type: 'status_change',
      severity: 'info',
      timestamp: new Date().toISOString(),
    };
    await insertEvent(event);

    res.status(200).json({ ok: true, report });
  } catch (err) {
    console.error('[api/status]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
