-- Migration 003: Migration tracking table

CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ DEFAULT now()
);
