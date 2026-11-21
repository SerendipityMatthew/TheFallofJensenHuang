-- Additive migration: preserves all existing articles and verification history.
ALTER TABLE articles ADD COLUMN original_published_at TEXT;
ALTER TABLE articles ADD COLUMN original_timezone TEXT;
ALTER TABLE articles ADD COLUMN translated_headline TEXT;
ALTER TABLE articles ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
ALTER TABLE articles ADD COLUMN region TEXT;
ALTER TABLE articles ADD COLUMN secondary_topics TEXT NOT NULL DEFAULT '[]';
ALTER TABLE articles ADD COLUMN syndication_key TEXT;
ALTER TABLE articles ADD COLUMN ingestion_job_id INTEGER;
ALTER TABLE articles ADD COLUMN last_checked_at TEXT;
ALTER TABLE claims ADD COLUMN claim_type TEXT NOT NULL DEFAULT 'Factual claim';
ALTER TABLE corrections ADD COLUMN correction_type TEXT NOT NULL DEFAULT 'Correction';
ALTER TABLE corrections ADD COLUMN detected_at TEXT;
CREATE TABLE events (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL,
  occurred_at TEXT NOT NULL, became_public_at TEXT NOT NULL,
  original_timezone TEXT, verification_status TEXT NOT NULL,
  last_checked_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE event_sources (
  id INTEGER PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id),
  source_url TEXT NOT NULL, source_type TEXT NOT NULL, checked_at TEXT NOT NULL,
  note TEXT, UNIQUE(event_id, source_url)
);
CREATE TABLE article_events (
  article_id TEXT NOT NULL REFERENCES articles(id), event_id TEXT NOT NULL REFERENCES events(id),
  relationship_type TEXT NOT NULL CHECK(relationship_type IN ('First report','Follow-up report','Investigation','Commentary','Correction','Fact-check','Background analysis')),
  evidence_url TEXT NOT NULL, verification_status TEXT NOT NULL,
  checked_at TEXT NOT NULL, PRIMARY KEY(article_id, event_id)
);
CREATE TABLE claim_evidence (
  id INTEGER PRIMARY KEY, claim_id INTEGER NOT NULL REFERENCES claims(id),
  source_url TEXT NOT NULL, source_kind TEXT NOT NULL,
  verification_status TEXT NOT NULL, note TEXT, checked_at TEXT NOT NULL
);
CREATE TABLE responses (
  id INTEGER PRIMARY KEY, article_id TEXT NOT NULL REFERENCES articles(id),
  party TEXT NOT NULL, response_text TEXT NOT NULL, source_url TEXT NOT NULL,
  response_at TEXT, checked_at TEXT NOT NULL
);
CREATE TABLE research_reports (
  id TEXT PRIMARY KEY, report_type TEXT NOT NULL CHECK(report_type IN ('Article','Event','Media coverage','Periodic')),
  subject_id TEXT, title TEXT NOT NULL, body_json TEXT NOT NULL,
  research_status TEXT NOT NULL CHECK(research_status IN ('Draft','In review','Verified')),
  period_start TEXT, period_end TEXT, generated_at TEXT,
  last_reviewed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE report_sources (
  report_id TEXT NOT NULL REFERENCES research_reports(id), source_url TEXT NOT NULL,
  note TEXT, checked_at TEXT, PRIMARY KEY(report_id, source_url)
);
CREATE TABLE ingestion_jobs (
  id INTEGER PRIMARY KEY, provider TEXT NOT NULL, source_url TEXT,
  query TEXT, status TEXT NOT NULL, discovered_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0, error TEXT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, finished_at TEXT
);
CREATE TABLE verification_logs (
  id INTEGER PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  old_status TEXT, new_status TEXT NOT NULL, reviewer TEXT NOT NULL,
  reason TEXT NOT NULL, source_url TEXT, checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE article_updates (
  id INTEGER PRIMARY KEY, article_id TEXT NOT NULL REFERENCES articles(id),
  update_type TEXT NOT NULL, old_value TEXT, new_value TEXT,
  source_url TEXT NOT NULL, recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX events_occurred_at ON events(occurred_at);
CREATE INDEX events_public_at ON events(became_public_at);
CREATE INDEX article_events_event ON article_events(event_id, article_id);
CREATE INDEX articles_syndication ON articles(syndication_key);
CREATE INDEX articles_original_time ON articles(original_published_at);
CREATE INDEX research_reports_type_status ON research_reports(report_type, research_status);
CREATE INDEX ingestion_jobs_status ON ingestion_jobs(status, started_at);
CREATE INDEX verification_logs_entity ON verification_logs(entity_type, entity_id, checked_at);
