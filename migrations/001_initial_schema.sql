-- Migration 001: Initial schema
-- JCSA Quarterly Industry Survey

-- Active survey definitions
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  sector TEXT NOT NULL CHECK (sector IN ('manufacturers','retailers','wholesalers_importers','diamond_dealers','refiners')),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sections within a survey (pillars)
CREATE TABLE IF NOT EXISTS survey_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL,
  pillar TEXT NOT NULL
);

-- Questions within sections
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES survey_sections(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('single_choice','multi_choice','percentage_split','band_select','free_text')),
  options JSONB,
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- Branching rules evaluated dynamically
CREATE TABLE IF NOT EXISTS branching_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
  source_question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  condition JSONB NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('skip_section','hide_section','show_section','skip_question')),
  target_section_id UUID REFERENCES survey_sections(id) ON DELETE SET NULL,
  target_question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  explanation TEXT
);

-- Individual survey submissions (anonymous)
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES surveys(id),
  sector TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL,
  size_band TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- One row per answer per submission
CREATE TABLE IF NOT EXISTS answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  answer_value TEXT,
  answer_values JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Only the HASH of the receipt code is stored
CREATE TABLE IF NOT EXISTS receipt_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL UNIQUE,
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pre-computed aggregates
CREATE TABLE IF NOT EXISTS aggregates_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  dimensions JSONB NOT NULL,
  result JSONB NOT NULL,
  response_count INTEGER NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT now()
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log for admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL,
  details JSONB,
  performed_at TIMESTAMPTZ DEFAULT now()
);
