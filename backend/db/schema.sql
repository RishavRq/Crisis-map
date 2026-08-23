-- ============================================================
-- CRISIS MAP — SUPABASE SCHEMA
-- Run this in the Supabase SQL Editor to initialize the DB.
-- ============================================================

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- ROW LEVEL SECURITY
-- Disable RLS so the anon key can read/write.
-- For production, create proper policies instead.
-- ============================================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;

-- Allow anon full access (public app, no auth)
CREATE POLICY "anon_all_reports" ON reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_events" ON live_events FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- REPORTS TABLE
-- ============================================================
-- id is TEXT because the app generates IDs like
-- "rpt-mock-xxx", "usgs-xxx", "gdacs-xxx", "rpt-user-xxx"
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    type        VARCHAR(50) NOT NULL,
    severity    VARCHAR(20) NOT NULL,
    status      VARCHAR(20) DEFAULT 'unverified',
    location    GEOMETRY(Point, 4326) NOT NULL,
    location_name TEXT,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    reported_by TEXT,
    report_count INTEGER DEFAULT 1,
    keywords    TEXT[],
    source      VARCHAR(50) DEFAULT 'user'
);

CREATE INDEX IF NOT EXISTS reports_location_idx ON reports USING GIST(location);
CREATE INDEX IF NOT EXISTS reports_status_idx   ON reports(status);
CREATE INDEX IF NOT EXISTS reports_severity_idx ON reports(severity);
CREATE INDEX IF NOT EXISTS reports_type_idx     ON reports(type);
CREATE INDEX IF NOT EXISTS reports_source_idx   ON reports(source);
CREATE INDEX IF NOT EXISTS reports_reported_at_idx ON reports(reported_at DESC);

-- ============================================================
-- LIVE EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS live_events (
    id        TEXT PRIMARY KEY,
    message   TEXT NOT NULL,
    type      VARCHAR(50) NOT NULL,
    severity  VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    report_id TEXT REFERENCES reports(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS live_events_timestamp_idx ON live_events(timestamp DESC);

-- ============================================================
-- CLUSTER COMPUTATION FUNCTION
-- ============================================================
-- Uses PostGIS ST_ClusterDBSCAN to group nearby reports into
-- clusters, then computes severity score for each cluster.
-- Called via Supabase RPC: SELECT * FROM compute_clusters()
-- ============================================================
CREATE OR REPLACE FUNCTION compute_clusters()
RETURNS TABLE (
    id              TEXT,
    centroid_lat    DOUBLE PRECISION,
    centroid_lng    DOUBLE PRECISION,
    radius_km       DOUBLE PRECISION,
    report_count    BIGINT,
    severity        VARCHAR(20),
    severity_score  DOUBLE PRECISION,
    primary_type    VARCHAR(50),
    title           TEXT,
    last_updated    TIMESTAMP WITH TIME ZONE,
    report_ids      TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH clustered AS (
        SELECT
            r.id AS rid,
            r.type AS rtype,
            r.severity AS rseverity,
            r.reported_at AS rreported_at,
            r.location_name AS rlocation_name,
            ST_ClusterDBSCAN(r.location, eps := 0.02, minpoints := 1) OVER () AS cluster_id
        FROM reports r
        WHERE r.status != 'resolved'
          AND r.reported_at > (now() - interval '24 hours')
    ),
    cluster_groups AS (
        SELECT
            cluster_id,
            array_agg(rid) AS rids,
            COUNT(*) AS cnt,
            -- Severity scoring: weighted sum
            SUM(CASE rseverity
                WHEN 'critical' THEN 10
                WHEN 'high'     THEN 7
                WHEN 'moderate' THEN 4
                WHEN 'low'      THEN 2
                WHEN 'info'     THEN 1
                ELSE 1
            END) AS severity_weight,
            -- Recency boost: reports less than 1 hour old
            SUM(CASE
                WHEN rreported_at > (now() - interval '1 hour') THEN 3
                ELSE 0
            END) AS recency_boost,
            -- Most common type
            MODE() WITHIN GROUP (ORDER BY rtype) AS dominant_type,
            -- Most recent report
            MAX(rreported_at) AS latest,
            -- Location name from the most recent report
            (ARRAY_AGG(rlocation_name ORDER BY rreported_at DESC))[1] AS loc_name
        FROM clustered
        WHERE cluster_id IS NOT NULL
        GROUP BY cluster_id
    ),
    scored AS (
        SELECT
            *,
            severity_weight + recency_boost * 3 + cnt * 2 AS score
        FROM cluster_groups
    )
    SELECT
        ('cls-' || s.cluster_id || '-' || EXTRACT(EPOCH FROM s.latest)::bigint)::TEXT AS id,
        ST_Y(ST_Centroid(ST_Collect(r.location))) AS centroid_lat,
        ST_X(ST_Centroid(ST_Collect(r.location))) AS centroid_lng,
        2.0::DOUBLE PRECISION AS radius_km,
        s.cnt AS report_count,
        CASE
            WHEN s.score >= 60 THEN 'critical'::VARCHAR(20)
            WHEN s.score >= 40 THEN 'high'::VARCHAR(20)
            WHEN s.score >= 20 THEN 'moderate'::VARCHAR(20)
            WHEN s.score >= 10 THEN 'low'::VARCHAR(20)
            ELSE 'info'::VARCHAR(20)
        END AS severity,
        ROUND(s.score, 0) AS severity_score,
        s.dominant_type AS primary_type,
        INITCAP(s.dominant_type) || ' cluster — ' || s.loc_name AS title,
        s.latest AS last_updated,
        s.rids AS report_ids
    FROM scored s
    JOIN clustered c ON c.cluster_id = s.cluster_id
    GROUP BY s.cluster_id, s.cnt, s.severity_weight, s.recency_boost,
             s.dominant_type, s.latest, s.loc_name, s.score, s.rids
    ORDER BY s.score DESC;
END;
$$ LANGUAGE plpgsql STABLE;
