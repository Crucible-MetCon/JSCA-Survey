// Rebuild the aggregates_cache table from existing submissions/answers
import pool, { query } from '../src/lib/db';

async function rebuildCache() {
  console.log('Rebuilding aggregates cache...\n');

  // Get all active surveys
  const surveys = await query<{ id: string; sector: string; year: number; quarter: number; title: string }>(
    'SELECT id, sector, year, quarter, title FROM surveys WHERE is_active = true'
  );

  // Clear existing cache
  await pool.query('DELETE FROM aggregates_cache');
  console.log('Cleared existing cache.\n');

  let totalEntries = 0;

  for (const survey of surveys) {
    // Get questions with their text for descriptive cache keys
    const questions = await query<{ id: string; question_text: string; question_type: string }>(
      `SELECT q.id, q.question_text, q.question_type
       FROM questions q
       JOIN survey_sections ss ON ss.id = q.section_id
       WHERE ss.survey_id = $1
       ORDER BY ss.sort_order, q.sort_order`,
      [survey.id]
    );

    // Get unique size bands for this survey
    const sizeBands = await query<{ size_band: string }>(
      'SELECT DISTINCT size_band FROM submissions WHERE survey_id = $1',
      [survey.id]
    );

    for (const q of questions) {
      // Build a descriptive cache key using question text
      const shortText = q.question_text
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .substring(0, 80)
        .trim()
        .replace(/\s+/g, '_')
        .toLowerCase();

      // Aggregate without size band filter
      const cacheKey = `${survey.year}-Q${survey.quarter}-${survey.sector}-${shortText}`;

      const rows = await query<{ answer_value: string | null; answer_values: string | null; cnt: string }>(
        `SELECT a.answer_value, a.answer_values::text, COUNT(*) as cnt
         FROM answers a
         JOIN submissions s ON s.id = a.submission_id
         WHERE a.question_id = $1
           AND s.survey_id = $2
           AND s.sector = $3
           AND s.year = $4
           AND s.quarter = $5
         GROUP BY a.answer_value, a.answer_values::text`,
        [q.id, survey.id, survey.sector, survey.year, survey.quarter]
      );

      const totalRows = await query<{ cnt: string }>(
        `SELECT COUNT(DISTINCT s.id) as cnt
         FROM submissions s
         JOIN answers a ON a.submission_id = s.id
         WHERE a.question_id = $1
           AND s.survey_id = $2
           AND s.sector = $3
           AND s.year = $4
           AND s.quarter = $5`,
        [q.id, survey.id, survey.sector, survey.year, survey.quarter]
      );

      const responseCount = parseInt(totalRows[0]?.cnt || '0', 10);
      const result: Record<string, number> = {};

      for (const row of rows) {
        if (row.answer_value) {
          result[row.answer_value] = parseInt(row.cnt, 10);
        } else if (row.answer_values) {
          try {
            const parsed = JSON.parse(row.answer_values);
            if (Array.isArray(parsed)) {
              const count = parseInt(row.cnt, 10);
              for (const v of parsed) {
                result[String(v)] = (result[String(v)] || 0) + count;
              }
            } else if (typeof parsed === 'object') {
              // Percentage split — average the values
              const count = parseInt(row.cnt, 10);
              for (const [k, v] of Object.entries(parsed)) {
                result[k] = (result[k] || 0) + (Number(v) * count);
              }
            }
          } catch {
            // Skip malformed
          }
        }
      }

      if (responseCount > 0) {
        await pool.query(
          `INSERT INTO aggregates_cache (cache_key, dimensions, result, response_count, computed_at)
           VALUES ($1, $2, $3, $4, now())
           ON CONFLICT (cache_key)
           DO UPDATE SET result = $3, response_count = $4, computed_at = now()`,
          [
            cacheKey,
            JSON.stringify({ year: survey.year, quarter: survey.quarter, sector: survey.sector, question_id: q.id, question_text: q.question_text }),
            JSON.stringify(result),
            responseCount,
          ]
        );
        totalEntries++;
      }

      // Also cache per size band
      for (const { size_band } of sizeBands.filter(sb => sb.size_band)) {
        const bandKey = `${cacheKey}-${size_band}`;

        const bandRows = await query<{ answer_value: string | null; answer_values: string | null; cnt: string }>(
          `SELECT a.answer_value, a.answer_values::text, COUNT(*) as cnt
           FROM answers a
           JOIN submissions s ON s.id = a.submission_id
           WHERE a.question_id = $1
             AND s.survey_id = $2
             AND s.sector = $3
             AND s.year = $4
             AND s.quarter = $5
             AND s.size_band = $6
           GROUP BY a.answer_value, a.answer_values::text`,
          [q.id, survey.id, survey.sector, survey.year, survey.quarter, size_band]
        );

        const bandTotal = await query<{ cnt: string }>(
          `SELECT COUNT(DISTINCT s.id) as cnt
           FROM submissions s
           JOIN answers a ON a.submission_id = s.id
           WHERE a.question_id = $1
             AND s.survey_id = $2
             AND s.sector = $3
             AND s.year = $4
             AND s.quarter = $5
             AND s.size_band = $6`,
          [q.id, survey.id, survey.sector, survey.year, survey.quarter, size_band]
        );

        const bandCount = parseInt(bandTotal[0]?.cnt || '0', 10);
        const bandResult: Record<string, number> = {};

        for (const row of bandRows) {
          if (row.answer_value) {
            bandResult[row.answer_value] = parseInt(row.cnt, 10);
          } else if (row.answer_values) {
            try {
              const parsed = JSON.parse(row.answer_values);
              if (Array.isArray(parsed)) {
                const count = parseInt(row.cnt, 10);
                for (const v of parsed) {
                  bandResult[String(v)] = (bandResult[String(v)] || 0) + count;
                }
              } else if (typeof parsed === 'object') {
                const count = parseInt(row.cnt, 10);
                for (const [k, v] of Object.entries(parsed)) {
                  bandResult[k] = (bandResult[k] || 0) + (Number(v) * count);
                }
              }
            } catch {
              // Skip
            }
          }
        }

        if (bandCount > 0) {
          await pool.query(
            `INSERT INTO aggregates_cache (cache_key, dimensions, result, response_count, computed_at)
             VALUES ($1, $2, $3, $4, now())
             ON CONFLICT (cache_key)
             DO UPDATE SET result = $3, response_count = $4, computed_at = now()`,
            [
              bandKey,
              JSON.stringify({ year: survey.year, quarter: survey.quarter, sector: survey.sector, question_id: q.id, question_text: q.question_text, size_band }),
              JSON.stringify(bandResult),
              bandCount,
            ]
          );
          totalEntries++;
        }
      }
    }

    console.log(`  ${survey.title}: cached ${questions.length} questions`);
  }

  console.log(`\nDone! ${totalEntries} cache entries created.`);
  await pool.end();
}

rebuildCache();
