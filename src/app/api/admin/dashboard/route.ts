import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import { checkKAnonymity } from '@/lib/k-anonymity';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
  const quarter = searchParams.get('quarter') ? parseInt(searchParams.get('quarter')!) : undefined;
  const sector = searchParams.get('sector') || undefined;
  const sizeBand = searchParams.get('size_band') || undefined;

  try {
    // Build filter conditions
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (year) {
      conditions.push(`s.year = $${paramIdx++}`);
      params.push(year);
    }
    if (quarter) {
      conditions.push(`s.quarter = $${paramIdx++}`);
      params.push(quarter);
    }
    if (sector) {
      conditions.push(`s.sector = $${paramIdx++}`);
      params.push(sector);
    }
    if (sizeBand) {
      conditions.push(`s.size_band = $${paramIdx++}`);
      params.push(sizeBand);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Response counts by sector
    const sectorCounts = await query<{ sector: string; count: string }>(
      `SELECT s.sector, COUNT(*) as count FROM submissions s ${whereClause} GROUP BY s.sector`,
      params
    );

    // Total response count
    const totalResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM submissions s ${whereClause}`,
      params
    );
    const totalResponses = parseInt(totalResult[0]?.count || '0', 10);

    // Response counts by quarter (for trend)
    const quarterlyTrend = await query<{ year: number; quarter: number; count: string }>(
      `SELECT s.year, s.quarter, COUNT(*) as count FROM submissions s ${whereClause} GROUP BY s.year, s.quarter ORDER BY s.year, s.quarter`,
      params
    );

    // Size band distribution
    const sizeBandDist = await query<{ size_band: string; count: string }>(
      `SELECT s.size_band, COUNT(*) as count FROM submissions s ${whereClause} GROUP BY s.size_band ORDER BY s.size_band`,
      params
    );

    // Get aggregated question data from cache
    const cachedData = await query<{
      cache_key: string;
      dimensions: Record<string, string | number>;
      result: Record<string, number>;
      response_count: number;
    }>(
      `SELECT cache_key, dimensions, result, response_count FROM aggregates_cache ORDER BY computed_at DESC LIMIT 500`
    );

    // Apply k-anonymity to all data
    const processedCache = cachedData.map((entry) => {
      const kResult = checkKAnonymity(entry.result, entry.response_count);
      return {
        cache_key: entry.cache_key,
        dimensions: entry.dimensions,
        data: kResult.data,
        response_count: entry.response_count,
        suppressed: kResult.suppressed,
      };
    });

    return NextResponse.json({
      total_responses: totalResponses,
      sector_counts: sectorCounts.map((r) => ({
        sector: r.sector,
        count: parseInt(r.count, 10),
      })),
      quarterly_trend: quarterlyTrend.map((r) => ({
        year: r.year,
        quarter: r.quarter,
        count: parseInt(r.count, 10),
      })),
      size_band_distribution: sizeBandDist.map((r) => ({
        size_band: r.size_band,
        count: parseInt(r.count, 10),
      })),
      cached_aggregations: processedCache,
      filters: { year, quarter, sector, size_band: sizeBand },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}
