import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import 'dotenv/config';

import { Report, LiveEvent } from './types';
import { fetchUSGSEarthquakes } from './services/usgsService';
import { fetchGDACSEvents } from './services/gdacsService';
import {
  insertReport,
  insertReports,
  insertEvent,
  insertEvents,
  listReports,
  listEvents,
  updateReportStatus,
  findReport,
  computeClusters,
  computeClustersFallback,
} from './repo';
import { checkDbConnection } from './db';

// ============================================================
// CRISIS MAP — EXPRESS + WEBSOCKET SERVER (Supabase-backed)
// ============================================================

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

// ---------- HELPERS ----------

function broadcast(type: string, payload: unknown) {
  const data = JSON.stringify({ type, payload });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

/** Compute clusters, trying the PostGIS RPC first, falling back to in-app */
async function refreshClusters() {
  let clusters = await computeClusters();
  if (clusters.length === 0) {
    clusters = await computeClustersFallback();
  }
  return clusters;
}

/** Ingest a batch of reports + events into DB, broadcast to WS clients */
async function ingestBatch(reports: Report[], events: LiveEvent[]) {
  if (reports.length === 0) return;

  await insertReports(reports);
  await insertEvents(events);

  const clusters = await refreshClusters();

  for (const r of reports) broadcast('NEW_REPORT', r);
  broadcast('CLUSTERS_UPDATED', clusters);
  for (const e of events) broadcast('NEW_EVENT', e);
}

// ---------- STARTUP ----------

async function main() {
  const dbOk = await checkDbConnection();
  console.log(`[startup] Database: ${dbOk ? '✓ Connected' : '✗ Not reachable (using fallback)'}`);

  // ---------- API ROUTES ----------

  app.get('/health', (_req, res) => res.send('OK'));

  app.get('/api/reports', async (_req, res) => {
    const reports = await listReports(500);
    res.json(reports);
  });

  app.get('/api/clusters', async (_req, res) => {
    const clusters = await refreshClusters();
    res.json(clusters);
  });

  app.get('/api/events', async (_req, res) => {
    const events = await listEvents(50);
    res.json(events);
  });

  // ---------- INGESTION POLLERS ----------

  // USGS earthquake feed — every 30 seconds
  setInterval(async () => {
    try {
      const { reports: usgsReports, events: usgsEvents } = await fetchUSGSEarthquakes();
      if (usgsReports.length > 0) {
        await ingestBatch(usgsReports, usgsEvents);
      }
    } catch (err) {
      console.error('[usgs] Ingestion error:', err);
    }
  }, 30_000);

  // GDACS global alerts — every 60 seconds
  setInterval(async () => {
    try {
      const { reports: gdacsReports, events: gdacsEvents } = await fetchGDACSEvents();
      if (gdacsReports.length > 0) {
        await ingestBatch(gdacsReports, gdacsEvents);
      }
    } catch (err) {
      console.error('[gdacs] Ingestion error:', err);
    }
  }, 60_000);

  // ---------- WEBSOCKET ----------

  wss.on('connection', async (ws) => {
    console.log('[ws] Client connected');

    // Send current state to newly connected client
    const reports = await listReports(500);
    const events = await listEvents(50);
    const clusters = await refreshClusters();
    ws.send(JSON.stringify({
      type: 'INIT_STATE',
      payload: { reports, clusters, events },
    }));

    ws.on('message', async (msg) => {
      try {
        const data = JSON.parse(msg.toString());

        if (data.type === 'SUBMIT_REPORT') {
          const report = data.payload as Report;
          await insertReport(report);

          const event: LiveEvent = {
            id: `evt-${Date.now()}`,
            message: `User submitted ${report.severity} ${report.type} report from ${report.locationName}`,
            type: 'report',
            severity: report.severity,
            timestamp: new Date().toISOString(),
          };
          await insertEvent(event);

          const clusters = await refreshClusters();
          broadcast('NEW_REPORT', report);
          broadcast('CLUSTERS_UPDATED', clusters);
          broadcast('NEW_EVENT', event);
        }

        else if (data.type === 'UPDATE_STATUS') {
          const { id, status } = data.payload;
          const report = await updateReportStatus(id, status);
          if (report) {
            const event: LiveEvent = {
              id: `evt-${Date.now()}`,
              message: `Incident updated: ${report.title} status changed to ${status.toUpperCase()}`,
              type: 'status_change',
              severity: 'info',
              timestamp: new Date().toISOString(),
            };
            await insertEvent(event);

            const clusters = await refreshClusters();
            broadcast('REPORT_UPDATED', report);
            broadcast('CLUSTERS_UPDATED', clusters);
            broadcast('NEW_EVENT', event);
          }
        }
      } catch (e) {
        console.error('[ws] Message error:', e);
      }
    });
  });

  // ---------- START ----------

  server.listen(port, () => {
    console.log(`[server] Crisis Map API & WS running on port ${port}`);
  });
}

main().catch(err => {
  console.error('[startup] Fatal error:', err);
  process.exit(1);
});
