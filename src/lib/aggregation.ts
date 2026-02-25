import pool, { query, queryOne, execute } from './db';
import type { AggregateCache } from '@/types';

/**
 * Build a cache key from dimensions.
 */
export function buildCacheKey(
  year: number,
  quarter: number,
  sector: string,
  questionId: string,
  sizeBand?: string
): string {
  const parts = [year, `Q${quarter}`, sector, questionId];
  if (sizeBand) parts.push(sizeBand);
  return parts.join('-');
}

/**
 * Read from the aggregates cache.
 */
export async function readCache(cacheKey: string): Promise<AggregateCache | null> {
  return queryOne<AggregateCache>(
    'SELECT * FROM aggregates_cache WHERE cache_key = $1',
    [cacheKey]
  );
}

/**
 * Write or update a cache entry.
 */
export async function writeCache(
  cacheKey: string,
  dimensions: Record<string, string | number>,
  result: Record<string, number>,
  responseCount: number
): Promise<void> {
  await pool.query(
    `INSERT INTO aggregates_cache (cache_key, dimensions, result, response_count, computed_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (cache_key)
     DO UPDATE SET result = $3, response_count = $4, computed_at = now()`,
    [cacheKey, JSON.stringify(dimensions), JSON.stringify(result), responseCount]
  );
}

/**
 * Compute aggregated counts for a specific question in a given context.
 */
export async function computeAggregation(
  questionId: string,
  surveyId: string,
  sector: string,
  year: number,
  quarter: number,
  sizeBand?: string
): Promise<{ result: Record<string, number>; responseCount: number }> {
  let whereClause = `
    s.survey_id = $1
    AND s.sector = $2
    AND s.year = $3
    AND s.quarter = $4
  `;
  const params: unknown[] = [surveyId, sector, year, quarter];

  if (sizeBand) {
    whereClause += ` AND s.size_band = $5`;
    params.push(sizeBand);
  }

  // Count responses for this question
  const rows = await query<{ answer_value: string | null; answer_values: string | null; cnt: string }>(
    `SELECT a.answer_value, a.answer_values::text, COUNT(*) as cnt
     FROM answers a
     JOIN submissions s ON s.id = a.submission_id
     WHERE a.question_id = $${params.length + 1}
       AND ${whereClause}
     GROUP BY a.answer_value, a.answer_values::text`,
    [...params, questionId]
  );

  const totalRows = await query<{ cnt: string }>(
    `SELECT COUNT(DISTINCT s.id) as cnt
     FROM submissions s
     JOIN answers a ON a.submission_id = s.id
     WHERE a.question_id = $${params.length + 1}
       AND ${whereClause}`,
    [...params, questionId]
  );

  const responseCount = parseInt(totalRows[0]?.cnt || '0', 10);
  const result: Record<string, number> = {};

  for (const row of rows) {
    if (row.answer_value) {
      result[row.answer_value] = parseInt(row.cnt, 10);
    } else if (row.answer_values) {
      // For multi-choice, parse the JSON array and count each value
      try {
        const values = JSON.parse(row.answer_values) as string[];
        const count = parseInt(row.cnt, 10);
        for (const v of values) {
          result[v] = (result[v] || 0) + count;
        }
      } catch {
        // Skip malformed data
      }
    }
  }

  return { result, responseCount };
}

/**
 * Refresh the cache for a specific submission's dimensions.
 */
export async function refreshCacheForSubmission(
  surveyId: string,
  sector: string,
  year: number,
  quarter: number,
  sizeBand: string
): Promise<void> {
  // Get all question IDs for this survey
  const questions = await query<{ id: string }>(
    `SELECT q.id FROM questions q
     JOIN survey_sections ss ON ss.id = q.section_id
     WHERE ss.survey_id = $1`,
    [surveyId]
  );

  for (const q of questions) {
    // Cache without size band filter
    const cacheKey = buildCacheKey(year, quarter, sector, q.id);
    const agg = await computeAggregation(q.id, surveyId, sector, year, quarter);
    await writeCache(
      cacheKey,
      { year, quarter, sector, question_id: q.id },
      agg.result,
      agg.responseCount
    );

    // Cache with size band filter
    const cacheKeyWithBand = buildCacheKey(year, quarter, sector, q.id, sizeBand);
    const aggWithBand = await computeAggregation(q.id, surveyId, sector, year, quarter, sizeBand);
    await writeCache(
      cacheKeyWithBand,
      { year, quarter, sector, question_id: q.id, size_band: sizeBand },
      aggWithBand.result,
      aggWithBand.responseCount
    );
  }
}
