import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import { checkKAnonymity } from '@/lib/k-anonymity';
import { SECTOR_LABELS } from '@/types';
import type { Sector } from '@/types';
import Anthropic from '@anthropic-ai/sdk';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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

    // Gather participation stats
    const totalResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM submissions s ${whereClause}`,
      params
    );
    const totalResponses = parseInt(totalResult[0]?.count || '0', 10);

    const sectorCounts = await query<{ sector: string; count: string }>(
      `SELECT s.sector, COUNT(*) as count FROM submissions s ${whereClause} GROUP BY s.sector ORDER BY count DESC`,
      params
    );

    const sizeBandDist = await query<{ size_band: string; count: string }>(
      `SELECT s.size_band, COUNT(*) as count FROM submissions s ${whereClause} GROUP BY s.size_band ORDER BY count DESC`,
      params
    );

    const quarterlyTrend = await query<{ year: number; quarter: number; count: string }>(
      `SELECT s.year, s.quarter, COUNT(*) as count FROM submissions s ${whereClause} GROUP BY s.year, s.quarter ORDER BY s.year, s.quarter`,
      params
    );

    // Get cached aggregations with question text
    const cachedData = await query<{
      cache_key: string;
      dimensions: Record<string, string | number>;
      result: Record<string, number>;
      response_count: number;
    }>(
      `SELECT cache_key, dimensions, result, response_count FROM aggregates_cache ORDER BY cache_key LIMIT 500`
    );

    // Filter out k-anonymity-suppressed entries
    const validAggregations = cachedData
      .map((entry) => {
        const kResult = checkKAnonymity(entry.result, entry.response_count);
        if (kResult.suppressed) return null;
        return {
          cache_key: entry.cache_key,
          dimensions: entry.dimensions,
          data: kResult.data,
          response_count: entry.response_count,
        };
      })
      .filter(Boolean);

    // Build the prompt
    const filterDesc = [];
    if (year) filterDesc.push(`Year: ${year}`);
    if (quarter) filterDesc.push(`Quarter: Q${quarter}`);
    if (sector) filterDesc.push(`Sector: ${SECTOR_LABELS[sector as Sector] || sector}`);
    if (sizeBand) filterDesc.push(`Size band: ${sizeBand}`);
    const filterStr = filterDesc.length > 0 ? filterDesc.join(', ') : 'No filters (all data)';

    const sectorBreakdown = sectorCounts
      .map((r) => `  - ${SECTOR_LABELS[r.sector as Sector] || r.sector}: ${r.count} responses`)
      .join('\n');

    const sizeBreakdown = sizeBandDist
      .map((r) => `  - ${r.size_band} employees: ${r.count} responses`)
      .join('\n');

    const trendBreakdown = quarterlyTrend
      .map((r) => `  - ${r.year} Q${r.quarter}: ${r.count} responses`)
      .join('\n');

    // Group aggregations by sector for clearer analysis
    const bySector: Record<string, typeof validAggregations> = {};
    for (const agg of validAggregations) {
      if (!agg) continue;
      const aggSector = (agg.dimensions.sector as string) || 'unknown';
      if (!bySector[aggSector]) bySector[aggSector] = [];
      bySector[aggSector].push(agg);
    }

    let aggregationText = '';
    for (const [sectorKey, aggs] of Object.entries(bySector)) {
      const sectorLabel = SECTOR_LABELS[sectorKey as Sector] || sectorKey;
      aggregationText += `\n### ${sectorLabel}\n`;
      for (const agg of aggs) {
        if (!agg) continue;
        const questionText = agg.dimensions.question_text || agg.cache_key;
        aggregationText += `\n**${questionText}** (${agg.response_count} responses)\n`;
        const entries = Object.entries(agg.data!);
        entries.sort((a, b) => b[1] - a[1]);
        for (const [key, count] of entries) {
          const pct = agg.response_count > 0 ? ((count / agg.response_count) * 100).toFixed(1) : '0';
          aggregationText += `  - ${key}: ${count} (${pct}%)\n`;
        }
      }
    }

    const systemPrompt = `You are a senior industry analyst writing an executive summary for the Jewellery Council of South Africa (JCSA). Write in a professional but accessible style. Use markdown formatting with headings, bullet points, and bold text where appropriate. Structure the summary as follows:

1. **Participation Overview** — Comment on total responses, sector representation, size band distribution, and data quality
2. **Sector-by-Sector Analysis** — For each sector with sufficient data, highlight key findings, trends, and noteworthy patterns
3. **Cross-Sector Themes** — Identify common themes, divergences, or interesting contrasts between sectors
4. **Key Takeaways & Outlook** — Summarise the most important insights and any forward-looking observations

Keep the tone analytical and data-driven. Reference specific numbers and percentages. If data is limited for certain sectors, note this. Do not fabricate data — only discuss what is provided.`;

    const userPrompt = `Please write an executive summary for the JCSA Quarterly Industry Survey based on the following data.

**Filters Applied:** ${filterStr}

## Participation Statistics
- **Total Responses:** ${totalResponses}

### By Sector
${sectorBreakdown || '  No sector data available.'}

### By Business Size
${sizeBreakdown || '  No size data available.'}

### Quarterly Trend
${trendBreakdown || '  No trend data available.'}

## Survey Response Data (Aggregated)
${aggregationText || 'No aggregated data available.'}`;

    // Stream the response using SSE
    const anthropic = new Anthropic({ apiKey });

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const data = JSON.stringify({ text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          const errorData = JSON.stringify({
            error: err instanceof Error ? err.message : 'Stream failed',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('AI Summary error:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate summary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
