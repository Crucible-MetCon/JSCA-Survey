import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import path from 'path';
import fs from 'fs';

// Letterhead layout constants (A4: 595.28 x 841.89 pts)
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const SIDEBAR_WIDTH = 120; // width of the gold sidebar strip
const CONTENT_LEFT = SIDEBAR_WIDTH + 30; // left edge of main content
const CONTENT_RIGHT = PAGE_WIDTH - 40; // right edge
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;
const TOP_MARGIN = 60;
const BOTTOM_MARGIN = 80; // space for footer

// Colors from the letterhead
const NAVY = '#1B2A4A';
const DARK_GRAY = '#595959';
const GOLD = '#BF8F00';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { content: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { content } = body;
  if (!content) {
    return NextResponse.json({ error: 'No content to export' }, { status: 400 });
  }

  const PDFDocument = (await import('pdfkit')).default;

  // Resolve letterhead asset paths
  const assetsDir = path.join(process.cwd(), 'src', 'assets', 'letterhead');
  const sidebarPath = path.join(assetsDir, 'sidebar.jpeg');
  const logoPath = path.join(assetsDir, 'logo.png');
  const sealPath = path.join(assetsDir, 'seal.png');

  const hasSidebar = fs.existsSync(sidebarPath);
  const hasLogo = fs.existsSync(logoPath);
  const hasSeal = fs.existsSync(sealPath);

  return new Promise<NextResponse>((resolve) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: TOP_MARGIN, bottom: BOTTOM_MARGIN, left: CONTENT_LEFT, right: 40 },
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(
        new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="JCSA-AI-Executive-Summary.pdf"',
          },
        })
      );
    });

    // Helper: draw letterhead on a page
    function drawLetterhead(isFirstPage: boolean) {
      // Gold sidebar strip
      if (hasSidebar) {
        doc.image(sidebarPath, 0, 0, { width: SIDEBAR_WIDTH, height: PAGE_HEIGHT });
      } else {
        // Fallback: draw a gold rectangle
        doc.rect(0, 0, SIDEBAR_WIDTH, PAGE_HEIGHT).fill('#F5E6B8');
      }

      if (isFirstPage) {
        // Logo on top of sidebar
        if (hasLogo) {
          doc.image(logoPath, 20, 15, { width: 75 });
        }

        // "Incorporating" text on sidebar
        const incY = 170;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK_GRAY);
        doc.text('Incorporating:', 10, incY, { width: SIDEBAR_WIDTH - 10, align: 'center' });
        doc.font('Helvetica').fontSize(7).fillColor(DARK_GRAY);
        const categories = [
          'Manufacturers', 'Wholesalers', 'Retailers', 'Watches',
          'Gem and Diamond', 'Dealers', 'Numismatists', 'Refiners',
          'and', 'Supporting Industries',
        ];
        let catY = incY + 14;
        for (const cat of categories) {
          doc.text(cat, 10, catY, { width: SIDEBAR_WIDTH - 10, align: 'center' });
          catY += 10;
        }
      }

      // Footer tagline
      doc.font('Helvetica-BoldOblique').fontSize(8).fillColor(GOLD);
      doc.text(
        'Initiating, Implementing, Informing, Supporting, Representing',
        CONTENT_LEFT,
        PAGE_HEIGHT - 45,
        { width: CONTENT_WIDTH - 60, align: 'left' }
      );

      // Footer seal
      if (hasSeal) {
        doc.image(sealPath, PAGE_WIDTH - 80, PAGE_HEIGHT - 60, { width: 45 });
      }
    }

    // Parse markdown content and render to PDF
    function renderMarkdown(text: string) {
      const lines = text.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if we need a new page
        if (doc.y > PAGE_HEIGHT - BOTTOM_MARGIN - 30) {
          doc.addPage();
          drawLetterhead(false);
          doc.y = TOP_MARGIN;
          doc.x = CONTENT_LEFT;
        }

        // Headings
        if (line.startsWith('#### ')) {
          doc.moveDown(0.3);
          renderRichLine(line.slice(5), 'Helvetica-Bold', 10, NAVY);
          doc.moveDown(0.2);
          continue;
        }
        if (line.startsWith('### ')) {
          doc.moveDown(0.5);
          renderRichLine(line.slice(4), 'Helvetica-Bold', 11, NAVY);
          doc.moveDown(0.2);
          continue;
        }
        if (line.startsWith('## ')) {
          doc.moveDown(0.6);
          renderRichLine(line.slice(3), 'Helvetica-Bold', 13, NAVY);
          // Underline
          const lineY = doc.y + 2;
          doc.moveTo(CONTENT_LEFT, lineY).lineTo(CONTENT_RIGHT, lineY).strokeColor('#E5E5E5').lineWidth(0.5).stroke();
          doc.moveDown(0.4);
          continue;
        }
        if (line.startsWith('# ')) {
          doc.moveDown(0.8);
          renderRichLine(line.slice(2), 'Helvetica-Bold', 15, NAVY);
          doc.moveDown(0.4);
          continue;
        }

        // Horizontal rule
        if (/^---+$/.test(line.trim())) {
          doc.moveDown(0.3);
          const hrY = doc.y;
          doc.moveTo(CONTENT_LEFT, hrY).lineTo(CONTENT_RIGHT, hrY).strokeColor('#CCCCCC').lineWidth(0.5).stroke();
          doc.moveDown(0.3);
          continue;
        }

        // Unordered list items
        const ulMatch = line.match(/^(\s*)[-*]\s+(.*)/);
        if (ulMatch) {
          const indent = ulMatch[1].length > 0 ? 20 : 10;
          doc.font('Helvetica').fontSize(9).fillColor('#333333');
          doc.text('•', CONTENT_LEFT + indent - 10, doc.y, { continued: true, width: 10 });
          doc.text(' ', { continued: true });
          renderInlineFormatting(ulMatch[2], 9, '#333333');
          continue;
        }

        // Ordered list items
        const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
        if (olMatch) {
          const indent = olMatch[1].length > 0 ? 20 : 10;
          doc.font('Helvetica').fontSize(9).fillColor('#333333');
          doc.text(`${olMatch[2]}.`, CONTENT_LEFT + indent - 15, doc.y, { continued: true, width: 15 });
          doc.text(' ', { continued: true });
          renderInlineFormatting(olMatch[3], 9, '#333333');
          continue;
        }

        // Empty line
        if (line.trim() === '') {
          doc.moveDown(0.3);
          continue;
        }

        // Regular paragraph
        renderInlineFormatting(line, 9, '#333333');
      }
    }

    // Render a line with a specific font/size/color (no inline formatting)
    function renderRichLine(text: string, font: string, size: number, color: string) {
      // Handle bold markers in headings
      const cleaned = text.replace(/\*\*/g, '');
      doc.font(font).fontSize(size).fillColor(color);
      doc.text(cleaned, CONTENT_LEFT, doc.y, { width: CONTENT_WIDTH });
    }

    // Render text with **bold** inline formatting
    function renderInlineFormatting(text: string, size: number, color: string) {
      const parts = text.split(/(\*\*.*?\*\*)/);
      const xPos = doc.x >= CONTENT_LEFT ? undefined : CONTENT_LEFT;

      for (let j = 0; j < parts.length; j++) {
        const part = parts[j];
        if (!part) continue;

        const isBold = part.startsWith('**') && part.endsWith('**');
        const cleanText = isBold ? part.slice(2, -2) : part;
        const isLast = j === parts.length - 1;

        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(size)
          .fillColor(color);

        if (j === 0 && xPos !== undefined) {
          doc.text(cleanText, xPos, doc.y, {
            width: CONTENT_WIDTH,
            continued: !isLast,
          });
        } else {
          doc.text(cleanText, {
            width: CONTENT_WIDTH,
            continued: !isLast,
          });
        }
      }
    }

    // === Build the PDF ===

    // First page letterhead
    drawLetterhead(true);

    // Title
    doc.y = TOP_MARGIN;
    doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY);
    doc.text('AI Executive Summary', CONTENT_LEFT, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.2);

    doc.font('Helvetica').fontSize(9).fillColor(DARK_GRAY);
    doc.text(`JCSA Quarterly Industry Survey`, CONTENT_LEFT, doc.y, { width: CONTENT_WIDTH });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}`, CONTENT_LEFT, doc.y, { width: CONTENT_WIDTH });
    doc.moveDown(0.8);

    // Render the AI summary content
    renderMarkdown(content);

    doc.end();
  });
}
