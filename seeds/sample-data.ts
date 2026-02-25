// Generate 10 sample submissions per sector for demo/testing purposes
import pool from '../src/lib/db';
import { generateReceiptCode, hashReceiptCode } from '../src/lib/receipt';

const SIZE_BANDS = ['1-5', '6-20', '21-50', '51-200', '200+'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted<T>(arr: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i];
    if (r <= 0) return arr[i];
  }
  return arr[arr.length - 1];
}

async function generateSampleData() {
  const client = await pool.connect();

  try {
    // Get all active surveys with their questions
    const surveys = await client.query(
      `SELECT s.id, s.sector, s.year, s.quarter, s.title
       FROM surveys s WHERE s.is_active = true ORDER BY s.sector`
    );

    if (surveys.rows.length === 0) {
      console.error('No active surveys found. Run seed first.');
      return;
    }

    console.log(`Found ${surveys.rows.length} active surveys.\n`);

    let totalSubmissions = 0;

    for (const survey of surveys.rows) {
      // Get questions for this survey
      const questions = await client.query(
        `SELECT q.id, q.question_type, q.options, q.metadata
         FROM questions q
         JOIN survey_sections ss ON q.section_id = ss.id
         WHERE ss.survey_id = $1
         ORDER BY ss.sort_order, q.sort_order`,
        [survey.id]
      );

      console.log(`${survey.title}: ${questions.rows.length} questions`);

      // Generate 10 submissions
      for (let i = 0; i < 10; i++) {
        await client.query('BEGIN');

        const sizeBand = pickWeighted(SIZE_BANDS, [3, 4, 2, 1, 0.5]);

        // Create submission
        const subResult = await client.query(
          `INSERT INTO submissions (survey_id, sector, year, quarter, size_band)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [survey.id, survey.sector, survey.year, survey.quarter, sizeBand]
        );
        const submissionId = subResult.rows[0].id;

        // Generate answers for each question
        for (const q of questions.rows) {
          const options: { value: string; label: string }[] = q.options || [];
          const metadata = q.metadata || {};

          try {
            switch (q.question_type) {
              case 'single_choice':
              case 'band_select': {
                if (options.length > 0) {
                  // Skip "Prefer not to answer" and "Not applicable" most of the time
                  const mainOptions = options.filter(
                    (o: { value: string }) => o.value !== 'prefer_not_to_answer' && o.value !== 'not_applicable'
                  );
                  const chosen = mainOptions.length > 0 ? pick(mainOptions) : pick(options);
                  await client.query(
                    'INSERT INTO answers (submission_id, question_id, answer_value) VALUES ($1, $2, $3)',
                    [submissionId, q.id, chosen.value]
                  );
                }
                break;
              }

              case 'multi_choice': {
                if (options.length > 0) {
                  const mainOptions = options.filter(
                    (o: { value: string }) => o.value !== 'prefer_not_to_answer' && o.value !== 'not_applicable'
                  );
                  const maxSel = metadata.max_selections || 3;
                  const count = Math.min(
                    Math.floor(Math.random() * maxSel) + 1,
                    mainOptions.length
                  );
                  // Shuffle and pick
                  const shuffled = [...mainOptions].sort(() => Math.random() - 0.5);
                  const selected = shuffled.slice(0, count).map((o: { value: string }) => o.value);
                  await client.query(
                    'INSERT INTO answers (submission_id, question_id, answer_values) VALUES ($1, $2, $3)',
                    [submissionId, q.id, JSON.stringify(selected)]
                  );
                }
                break;
              }

              case 'percentage_split': {
                if (options.length > 0) {
                  const mainOptions = options.filter(
                    (o: { value: string }) => o.value !== 'prefer_not_to_answer' && o.value !== 'not_applicable'
                  );
                  const split: Record<string, number> = {};
                  let remaining = 100;
                  for (let j = 0; j < mainOptions.length - 1; j++) {
                    const val = Math.floor(Math.random() * remaining);
                    split[mainOptions[j].value] = val;
                    remaining -= val;
                  }
                  if (mainOptions.length > 0) {
                    split[mainOptions[mainOptions.length - 1].value] = remaining;
                  }
                  await client.query(
                    'INSERT INTO answers (submission_id, question_id, answer_values) VALUES ($1, $2, $3)',
                    [submissionId, q.id, JSON.stringify(split)]
                  );
                }
                break;
              }

              case 'free_text': {
                // Only fill some free text fields
                if (Math.random() > 0.6) {
                  const responses = [
                    'Market conditions have been challenging this quarter.',
                    'Seeing steady growth in online channels.',
                    'Supply chain delays continue to impact operations.',
                    'Positive outlook for the next quarter.',
                    'Competition from imports remains a concern.',
                    'Labour costs have increased significantly.',
                    'Customer demand is shifting towards sustainable products.',
                    'Regulatory compliance costs are rising.',
                  ];
                  await client.query(
                    'INSERT INTO answers (submission_id, question_id, answer_value) VALUES ($1, $2, $3)',
                    [submissionId, q.id, pick(responses)]
                  );
                }
                break;
              }
            }
          } catch {
            // Skip questions that fail (e.g. branching-hidden)
          }
        }

        // Generate receipt code
        const receiptCode = generateReceiptCode(survey.year, survey.quarter);
        const codeHash = hashReceiptCode(receiptCode);
        await client.query(
          'INSERT INTO receipt_codes (code_hash, submission_id) VALUES ($1, $2)',
          [codeHash, submissionId]
        );

        await client.query('COMMIT');
        totalSubmissions++;
      }

      console.log(`  -> 10 submissions created for ${survey.sector}`);
    }

    console.log(`\nDone! ${totalSubmissions} total sample submissions created.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Sample data generation failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

generateSampleData();
