import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface QuestionSummary {
  text: string;
  type: string;
  answer: string | string[] | Record<string, number> | null;
  options?: { value: string; label: string }[];
}

interface SectionPayload {
  title: string;
  pillar: string;
  questions: QuestionSummary[];
}

interface FullPayload {
  sector: string;
  sections: SectionPayload[];
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI summary not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { section?: SectionPayload; full?: FullPayload };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const isFullMode = !!body.full;
  const prompt = isFullMode
    ? buildFullPrompt(body.full!)
    : buildSectionPrompt(body.section!);

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'No data to summarise' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const systemPrompt = isFullMode
    ? `You are a friendly survey assistant for the Jewellery Council of South Africa (JCSA). Write a clear, conversational summary of the respondent's complete survey submission. Structure it with a brief intro, then a short paragraph per section. Use plain language. Highlight any notable patterns. Keep it under 300 words. Do not use markdown headings — use bold text for section names instead. Address the respondent as "you".`
    : `You are a friendly survey assistant for the Jewellery Council of South Africa (JCSA). Write 2-3 sentences summarising what the respondent answered in this survey section. Be conversational and use plain language. Do not use markdown headings. Address the respondent as "you".`;

  try {
    const anthropic = new Anthropic({ apiKey });

    const stream = anthropic.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: isFullMode ? 1024 : 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
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
    console.error('Survey summarise error:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate summary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function formatAnswer(q: QuestionSummary): string {
  if (q.answer === null || q.answer === undefined) return 'Not answered';

  if (typeof q.answer === 'string') {
    // Look up label from options
    if (q.options) {
      const opt = q.options.find((o) => o.value === q.answer);
      if (opt) return opt.label;
    }
    return q.answer;
  }

  if (Array.isArray(q.answer)) {
    if (q.options) {
      return q.answer
        .map((v) => {
          const opt = q.options!.find((o) => o.value === v);
          return opt ? opt.label : v;
        })
        .join(', ');
    }
    return q.answer.join(', ');
  }

  if (typeof q.answer === 'object') {
    // Percentage split
    const entries = Object.entries(q.answer);
    if (q.options) {
      return entries
        .filter(([, pct]) => pct > 0)
        .map(([key, pct]) => {
          const opt = q.options!.find((o) => o.value === key);
          return `${opt ? opt.label : key}: ${pct}%`;
        })
        .join(', ');
    }
    return entries.map(([k, v]) => `${k}: ${v}%`).join(', ');
  }

  return String(q.answer);
}

function buildSectionPrompt(section: SectionPayload): string | null {
  if (!section || !section.questions || section.questions.length === 0) return null;

  const answered = section.questions.filter((q) => q.answer !== null && q.answer !== undefined);
  if (answered.length === 0) return null;

  let prompt = `Survey section: "${section.title}" (${section.pillar})\n\nResponses:\n`;
  for (const q of answered) {
    prompt += `- ${q.text}: ${formatAnswer(q)}\n`;
  }

  return prompt;
}

function buildFullPrompt(full: FullPayload): string | null {
  if (!full || !full.sections || full.sections.length === 0) return null;

  let prompt = `Complete survey submission for the ${full.sector} sector.\n\n`;

  for (const section of full.sections) {
    const answered = section.questions.filter((q) => q.answer !== null && q.answer !== undefined);
    if (answered.length === 0) continue;

    prompt += `Section: "${section.title}" (${section.pillar})\n`;
    for (const q of answered) {
      prompt += `- ${q.text}: ${formatAnswer(q)}\n`;
    }
    prompt += '\n';
  }

  return prompt;
}
