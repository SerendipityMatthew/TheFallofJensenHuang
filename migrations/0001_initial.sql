PRAGMA foreign_keys = ON;
CREATE TABLE publications (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, website TEXT);
CREATE TABLE journalists (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE, bio TEXT, affiliation_start TEXT, affiliation_end TEXT);
CREATE TABLE articles (
  id TEXT PRIMARY KEY, canonical_url TEXT NOT NULL UNIQUE, headline TEXT NOT NULL,
  publication_id INTEGER NOT NULL REFERENCES publications(id), published_at TEXT NOT NULL,
  updated_at TEXT, article_type TEXT NOT NULL, sentiment TEXT NOT NULL, topic TEXT NOT NULL,
  evidence_level TEXT NOT NULL, summary TEXT NOT NULL, classification_reason TEXT NOT NULL,
  metadata_status TEXT NOT NULL DEFAULT 'Unverified', claim_status TEXT NOT NULL DEFAULT 'Unassessed',
  source_checked_at TEXT, published_in_tracker INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE article_authors (article_id TEXT NOT NULL REFERENCES articles(id), journalist_id INTEGER NOT NULL REFERENCES journalists(id), PRIMARY KEY(article_id, journalist_id));
CREATE TABLE sources (id INTEGER PRIMARY KEY, article_id TEXT REFERENCES articles(id), url TEXT NOT NULL, source_type TEXT NOT NULL, checked_at TEXT, note TEXT);
CREATE TABLE claims (id INTEGER PRIMARY KEY, article_id TEXT NOT NULL REFERENCES articles(id), claim_text TEXT NOT NULL, evidence_status TEXT NOT NULL DEFAULT 'Unassessed', source_id INTEGER REFERENCES sources(id), note TEXT);
CREATE TABLE funding_organizations (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, website TEXT);
CREATE TABLE funding_relationships (id INTEGER PRIMARY KEY, journalist_id INTEGER REFERENCES journalists(id), publication_id INTEGER REFERENCES publications(id), funding_organization_id INTEGER NOT NULL REFERENCES funding_organizations(id), relationship_type TEXT NOT NULL, amount TEXT, starts_at TEXT, ends_at TEXT, evidence_url TEXT NOT NULL, verification_status TEXT NOT NULL, CHECK(journalist_id IS NOT NULL OR publication_id IS NOT NULL));
CREATE TABLE corrections (id INTEGER PRIMARY KEY, article_id TEXT NOT NULL REFERENCES articles(id), published_at TEXT NOT NULL, description TEXT NOT NULL, source_url TEXT NOT NULL);
CREATE TABLE verification_records (id INTEGER PRIMARY KEY, article_id TEXT NOT NULL REFERENCES articles(id), status TEXT NOT NULL, reviewer TEXT NOT NULL, reason TEXT NOT NULL, checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE submissions (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, source_kind TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending', submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, reviewed_at TEXT);
CREATE TABLE audit_log (id INTEGER PRIMARY KEY, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX article_date ON articles(published_at);
CREATE INDEX submission_status ON submissions(status);
