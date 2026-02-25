import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { query } from '@/lib/db';
import { checkKAnonymity } from '@/lib/k-anonymity';
import type { AggregateCache } from '@/types';

interface ExportDataItem {
  cache_key: string;
  dimensions: Record<string, string | number>;
  data: Record<string, number> | null;
  response_count: number;
  suppressed: boolean;
  suppression_message: string | null;
}

async function getExportData(
  year?: number,
  quarter?: number,
  sector?: string,
  sizeBand?: string
): Promise<{ items: ExportDataItem[]; totalResponses: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (year) { conditions.push(`s.year = $${paramIdx++}`); params.push(year); }
  if (quarter) { conditions.push(`s.quarter = $${paramIdx++}`); params.push(quarter); }
  if (sector) { conditions.push(`s.sector = $${paramIdx++}`); params.push(sector); }
  if (sizeBand) { conditions.push(`s.size_band = $${paramIdx++}`); params.push(sizeBand); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM submissions s ${whereClause}`,
    params
  );
  const totalResponses = parseInt(totalResult[0]?.count || '0', 10);

  const cached = await query<AggregateCache>(
    'SELECT * FROM aggregates_cache ORDER BY computed_at DESC LIMIT 200'
  );

  const items: ExportDataItem[] = cached.map((entry) => {
    const kResult = checkKAnonymity(entry.result, entry.response_count);
    return {
      cache_key: entry.cache_key,
      dimensions: entry.dimensions,
      data: kResult.data as Record<string, number> | null,
      response_count: entry.response_count,
      suppressed: kResult.suppressed,
      suppression_message: kResult.message,
    };
  });

  return { items, totalResponses };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
  const quarter = searchParams.get('quarter') ? parseInt(searchParams.get('quarter')!) : undefined;
  const sector = searchParams.get('sector') || undefined;
  const sizeBand = searchParams.get('size_band') || undefined;

  const { items, totalResponses } = await getExportData(year, quarter, sector, sizeBand);

  if (format === 'pdf') {
    return generatePDF(items, totalResponses, year, quarter, sector);
  } else if (format === 'pptx') {
    return generatePPTX(items, totalResponses, year, quarter, sector);
  }

  return NextResponse.json({ error: 'Invalid format. Use pdf or pptx.' }, { status: 400 });
}

async function generatePDF(
  items: ExportDataItem[],
  totalResponses: number,
  year?: number,
  quarter?: number,
  sector?: string
): Promise<NextResponse> {
  const PDFDocument = (await import('pdfkit')).default;

  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(
        new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="JCSA-Survey-Report.pdf"',
          },
        })
      );
    });

    // Title page
    doc.fontSize(28).fillColor('#1B2A4A').text('JCSA', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(20).text('Quarterly Industry Survey Report', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(14).fillColor('#666');
    if (year) doc.text(`Year: ${year}`, { align: 'center' });
    if (quarter) doc.text(`Quarter: Q${quarter}`, { align: 'center' });
    if (sector) doc.text(`Sector: ${sector}`, { align: 'center' });
    doc.text(`Total Responses: ${totalResponses}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });

    // Methodology page
    doc.addPage();
    doc.fontSize(18).fillColor('#1B2A4A').text('Methodology');
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#333');
    doc.text('This report presents aggregated, anonymous survey data collected from South African jewellery industry participants.');
    doc.moveDown(0.3);
    doc.text('Data collection: Banded/structured responses only. No identifying information collected.');
    doc.text('K-anonymity: Data slices with fewer than 5 responses are suppressed.');
    doc.text('Retention: Structured data retained 5 years. Free text retained 12 months max.');

    // Data pages
    doc.addPage();
    doc.fontSize(18).fillColor('#1B2A4A').text('Survey Results');
    doc.moveDown(0.5);

    for (const item of items) {
      if (doc.y > 650) doc.addPage();

      doc.fontSize(11).fillColor('#1B2A4A').text(item.cache_key);
      doc.moveDown(0.2);

      if (item.suppressed) {
        doc.fontSize(9).fillColor('#999').text('Insufficient responses to preserve anonymity.');
      } else if (item.data) {
        doc.fontSize(9).fillColor('#333').text(`Responses: ${item.response_count}`);
        const total = Object.values(item.data).reduce((s, v) => s + v, 0);
        for (const [label, count] of Object.entries(item.data)) {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          doc.text(`  ${label}: ${count} (${pct}%)`);
        }
      }
      doc.moveDown(0.5);
    }

    doc.end();
  });
}

async function generatePPTX(
  items: ExportDataItem[],
  totalResponses: number,
  year?: number,
  quarter?: number,
  sector?: string
): Promise<NextResponse> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_WIDE';

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText('JCSA Quarterly Industry Survey', {
    x: 1, y: 1.5, w: 11, h: 1,
    fontSize: 32, color: '1B2A4A', bold: true, align: 'center',
  });
  const subtitle = [
    year ? `Year: ${year}` : '',
    quarter ? `Quarter: Q${quarter}` : '',
    sector ? `Sector: ${sector}` : '',
    `Total Responses: ${totalResponses}`,
    `Generated: ${new Date().toLocaleDateString()}`,
  ].filter(Boolean).join(' | ');
  titleSlide.addText(subtitle, {
    x: 1, y: 3, w: 11, h: 0.5,
    fontSize: 14, color: '666666', align: 'center',
  });

  // Methodology slide
  const methSlide = pptx.addSlide();
  methSlide.addText('Methodology', {
    x: 0.5, y: 0.3, w: 12, h: 0.6,
    fontSize: 24, color: '1B2A4A', bold: true,
  });
  methSlide.addText([
    { text: 'Data collection: ', options: { bold: true } },
    { text: 'Banded/structured responses only. No identifying information collected.\n' },
    { text: 'K-anonymity: ', options: { bold: true } },
    { text: 'Data slices with fewer than 5 responses are suppressed.\n' },
    { text: 'Retention: ', options: { bold: true } },
    { text: 'Structured data retained 5 years. Free text retained 12 months max.' },
  ], { x: 0.5, y: 1.2, w: 12, h: 3, fontSize: 12, color: '333333' });

  // Data slides
  for (const item of items) {
    const slide = pptx.addSlide();
    slide.addText(item.cache_key, {
      x: 0.5, y: 0.3, w: 12, h: 0.6,
      fontSize: 18, color: '1B2A4A', bold: true,
    });

    if (item.suppressed) {
      slide.addText('Insufficient responses to preserve anonymity.', {
        x: 0.5, y: 2, w: 12, h: 1,
        fontSize: 14, color: '999999', italic: true, align: 'center',
      });
    } else if (item.data) {
      const total = Object.values(item.data).reduce((s, v) => s + v, 0);
      const tableRows: Array<Array<{ text: string; options?: Record<string, unknown> }>> = [
        [
          { text: 'Option', options: { bold: true, fill: { color: '1B2A4A' }, color: 'FFFFFF' } },
          { text: 'Count', options: { bold: true, fill: { color: '1B2A4A' }, color: 'FFFFFF' } },
          { text: 'Percentage', options: { bold: true, fill: { color: '1B2A4A' }, color: 'FFFFFF' } },
        ],
      ];
      for (const [label, count] of Object.entries(item.data)) {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        tableRows.push([
          { text: label },
          { text: String(count) },
          { text: `${pct}%` },
        ]);
      }
      slide.addTable(tableRows, { x: 0.5, y: 1.2, w: 12, fontSize: 11 });
      slide.addText(`n=${item.response_count}`, {
        x: 0.5, y: 6.5, w: 4, h: 0.3,
        fontSize: 9, color: '999999',
      });
    }
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': 'attachment; filename="JCSA-Survey-Report.pptx"',
    },
  });
}
