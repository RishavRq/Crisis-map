import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listReports, insertReport } from '../backend/src/repo.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const limit = Math.min(Number(req.query.limit) || 500, 1000);
      const reports = await listReports(limit);
      return res.status(200).json(reports);
    }

    if (req.method === 'POST') {
      const report = req.body;
      if (!report?.id || !report?.title) {
        return res.status(400).json({ error: 'Missing required fields: id, title' });
      }
      await insertReport(report);
      return res.status(201).json({ ok: true, id: report.id });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[api/reports]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
