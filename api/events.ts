import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listEvents } from '../backend/src/repo.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const events = await listEvents(limit);
    res.status(200).json(events);
  } catch (err) {
    console.error('[api/events]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
