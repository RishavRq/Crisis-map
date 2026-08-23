import type { VercelRequest, VercelResponse } from '@vercel/node';
import { insertReport, insertEvent } from '../backend/src/repo.js';
import type { Report, LiveEvent } from '../backend/src/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const report = req.body as Report;
    if (!report?.title) {
      return res.status(400).json({ error: 'Missing required field: title' });
    }

    // Ensure user-submitted reports have proper defaults
    report.source = 'user';
    report.status = 'unverified';
    report.reportCount = report.reportCount ?? 1;
    report.reportedBy = report.reportedBy ?? 'User-Web';
    report.reportedAt = report.reportedAt ?? new Date().toISOString();
    report.keywords = report.keywords ?? [report.type, report.severity];

    await insertReport(report);

    // Create a live event for the submission
    const event: LiveEvent = {
      id: `evt-submit-${Date.now()}`,
      message: `User submitted ${report.severity} ${report.type} report from ${report.locationName}`,
      type: 'report',
      severity: report.severity,
      timestamp: new Date().toISOString(),
    };
    await insertEvent(event);

    res.status(201).json({ ok: true, id: report.id });
  } catch (err) {
    console.error('[api/submit]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
