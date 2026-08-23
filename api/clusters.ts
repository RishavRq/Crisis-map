import type { VercelRequest, VercelResponse } from '@vercel/node';
import { computeClusters, computeClustersFallback } from '../backend/src/repo.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let clusters = await computeClusters();
    if (clusters.length === 0) {
      clusters = await computeClustersFallback();
    }
    res.status(200).json(clusters);
  } catch (err) {
    console.error('[api/clusters]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
