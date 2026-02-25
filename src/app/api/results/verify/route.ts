import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashReceiptCode } from '@/lib/receipt';
import { checkKAnonymity } from '@/lib/k-anonymity';
import type { AggregateCache, Question, SurveySection } from '@/types';

// Simple in-memory rate limiter (per-session based on a header or fallback)
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimiter.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  // Rate limit by a non-identifying session key
  const rateLimitKey = request.headers.get('x-request-id') || 'anonymous';
  if (!checkRateLimit(rateLimitKey)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait 15 minutes before trying again.' },
      { status: 429 }
    );
  }

  let body: { code: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { code } = body;
  if (!code || typeof code !== 'string') {
    return NextResponse.json(
      { error: 'Unable to verify code. Please check and try again.' },
      { status: 400 }
    );
  }

  try {
    const codeHash = hashReceiptCode(code.trim().toUpperCase());

    // Look up the hash
    const receipt = await queryOne<{
      submission_id: string;
    }>('SELECT submission_id FROM receipt_codes WHERE code_hash = $1', [codeHash]);

    if (!receipt) {
      return NextResponse.json(
        { error: 'Unable to verify code. Please check and try again.' },
        { status: 404 }
      );
    }

    // Get submission details
    const submission = await queryOne<{
      survey_id: string;
      sector: string;
      year: number;
      quarter: number;
    }>('SELECT survey_id, sector, year, quarter FROM submissions WHERE id = $1', [
      receipt.submission_id,
    ]);

    if (!submission) {
      return NextResponse.json(
        { error: 'Unable to verify code. Please check and try again.' },
        { status: 404 }
      );
    }

    // Get aggregated results for this survey's sector/quarter
    const sections = await query<SurveySection>(
      'SELECT * FROM survey_sections WHERE survey_id = $1 ORDER BY sort_order',
      [submission.survey_id]
    );

    const sectionIds = sections.map((s) => s.id);
    let questions: Question[] = [];
    if (sectionIds.length > 0) {
      const placeholders = sectionIds.map((_, i) => `$${i + 1}`).join(',');
      questions = await query<Question>(
        `SELECT * FROM questions WHERE section_id IN (${placeholders}) ORDER BY sort_order`,
        sectionIds
      );
    }

    // Build results from cache or compute live
    const results: {
      question_id: string;
      question_text: string;
      question_type: string;
      section_title: string;
      pillar: string;
      data: Record<string, number> | null;
      response_count: number;
      suppressed: boolean;
      suppression_message: string | null;
    }[] = [];

    for (const question of questions) {
      const section = sections.find((s) => s.id === question.section_id);
      const cacheKey = `${submission.year}-Q${submission.quarter}-${submission.sector}-${question.id}`;

      const cached = await queryOne<AggregateCache>(
        'SELECT * FROM aggregates_cache WHERE cache_key = $1',
        [cacheKey]
      );

      if (cached) {
        const kResult = checkKAnonymity(cached.result, cached.response_count);
        results.push({
          question_id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
          section_title: section?.title || '',
          pillar: section?.pillar || '',
          data: kResult.data as Record<string, number> | null,
          response_count: cached.response_count,
          suppressed: kResult.suppressed,
          suppression_message: kResult.message,
        });
      } else {
        // No cached data — skip (will show "no data" in UI)
        results.push({
          question_id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
          section_title: section?.title || '',
          pillar: section?.pillar || '',
          data: null,
          response_count: 0,
          suppressed: true,
          suppression_message: 'Insufficient responses to preserve anonymity.',
        });
      }
    }

    return NextResponse.json({
      sector: submission.sector,
      year: submission.year,
      quarter: submission.quarter,
      results,
    });
  } catch (err) {
    console.error('Results verification error:', err);
    return NextResponse.json({ error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}
