-- Migration 002: Indexes

CREATE INDEX IF NOT EXISTS idx_submissions_survey ON submissions(survey_id);
CREATE INDEX IF NOT EXISTS idx_submissions_sector_quarter ON submissions(sector, year, quarter);
CREATE INDEX IF NOT EXISTS idx_answers_submission ON answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_receipt_codes_hash ON receipt_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_aggregates_cache_key ON aggregates_cache(cache_key);
