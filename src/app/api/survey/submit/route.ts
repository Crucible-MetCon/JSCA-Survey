import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateReceiptCode, hashReceiptCode } from '@/lib/receipt';
import { refreshCacheForSubmission } from '@/lib/aggregation';
import type { SubmissionPayload, SubmissionResult, Sector } from '@/types';

const VALID_SECTORS: Sector[] = ['manufacturers', 'retailers', 'wholesalers_importers', 'diamond_dealers', 'refiners'];

export async function POST(request: NextRequest) {
  let body: SubmissionPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { survey_id, sector, size_band, answers } = body;

  if (!survey_id || !sector || !size_band || !answers) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!VALID_SECTORS.includes(sector)) {
    return NextResponse.json({ error: 'Invalid sector' }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Verify survey exists and is active
    const surveyResult = await client.query(
      'SELECT id, year, quarter FROM surveys WHERE id = $1 AND is_active = true',
      [survey_id]
    );

    if (surveyResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Survey not found or not active' }, { status: 404 });
    }

    const survey = surveyResult.rows[0];
    const { year, quarter } = survey;

    // Create submission
    const submissionResult = await client.query(
      `INSERT INTO submissions (survey_id, sector, year, quarter, size_band)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, submitted_at`,
      [survey_id, sector, year, quarter, size_band]
    );

    const submissionId = submissionResult.rows[0].id;
    const submittedAt = submissionResult.rows[0].submitted_at;

    // Insert answers
    for (const [questionId, value] of Object.entries(answers)) {
      if (typeof value === 'string') {
        await client.query(
          'INSERT INTO answers (submission_id, question_id, answer_value) VALUES ($1, $2, $3)',
          [submissionId, questionId, value]
        );
      } else if (Array.isArray(value)) {
        await client.query(
          'INSERT INTO answers (submission_id, question_id, answer_values) VALUES ($1, $2, $3)',
          [submissionId, questionId, JSON.stringify(value)]
        );
      } else if (typeof value === 'object') {
        // Percentage split — store as JSON in answer_values
        await client.query(
          'INSERT INTO answers (submission_id, question_id, answer_values) VALUES ($1, $2, $3)',
          [submissionId, questionId, JSON.stringify(value)]
        );
      }
    }

    // Generate receipt code
    const receiptCode = generateReceiptCode(year, quarter);
    const codeHash = hashReceiptCode(receiptCode);

    await client.query(
      'INSERT INTO receipt_codes (code_hash, submission_id) VALUES ($1, $2)',
      [codeHash, submissionId]
    );

    await client.query('COMMIT');

    // Refresh aggregate cache in the background (non-blocking)
    refreshCacheForSubmission(survey_id, sector, year, quarter, size_band).catch((err) => {
      console.error('Cache refresh failed:', err);
    });

    const result: SubmissionResult = {
      receipt_code: receiptCode,
      submitted_at: submittedAt,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Submission error:', err);
    return NextResponse.json({ error: 'Failed to submit survey' }, { status: 500 });
  } finally {
    client.release();
  }
}
