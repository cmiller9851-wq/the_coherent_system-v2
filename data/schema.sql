-- data/schema.sql
CREATE TABLE contributions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('runbook', 'protocol', 'experiment')),
  author TEXT NOT NULL,
  content_hash TEXT,
  tags JSON,
  merged_at TIMESTAMP,
  impact_feedback JSON
);

CREATE TABLE evolutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contrib_id TEXT REFERENCES contributions(id),
  user_handle TEXT,
  reflection TEXT,
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contribs_type_author ON contributions(type, author);
CREATE INDEX idx_evolutions_contrib ON evolutions(contrib_id);
CREATE INDEX idx_evolutions_timestamp ON evolutions(timestamp DESC);
