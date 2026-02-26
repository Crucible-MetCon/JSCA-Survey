'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import MarkdownRenderer from '@/components/admin/MarkdownRenderer';
import type { Question, SurveyAnswers } from '@/types';

interface SectionSummaryProps {
  sectionTitle: string;
  pillar: string;
  questions: Question[];
  answers: SurveyAnswers;
  sectionId: string;
  startedAt: number;
  sectionsCompleted: number;
  totalSections: number;
}

// Cache summaries by section ID so revisiting doesn't re-generate
const summaryCache = new Map<string, string>();

export default function SectionSummary({
  sectionTitle,
  pillar,
  questions,
  answers,
  sectionId,
  startedAt,
  sectionsCompleted,
  totalSections,
}: SectionSummaryProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasTriggered = useRef(false);

  // Check if any questions in this section have been answered
  const answeredQuestions = questions.filter(
    (q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== ''
  );
  const hasAnswers = answeredQuestions.length > 0;

  // Build a stable key based on answers to detect changes
  const answerKey = answeredQuestions
    .map((q) => `${q.id}:${JSON.stringify(answers[q.id])}`)
    .join('|');

  const generate = useCallback(async () => {
    // Check cache first
    const cacheKey = `${sectionId}:${answerKey}`;
    const cached = summaryCache.get(cacheKey);
    if (cached) {
      setContent(cached);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setContent('');
    setError(null);
    setLoading(true);

    try {
      const questionData = answeredQuestions.map((q) => ({
        text: q.question_text,
        type: q.question_type,
        answer: answers[q.id] ?? null,
        options: q.options || undefined,
      }));

      const elapsedMinutes = Math.round((Date.now() - startedAt) / 60000);

      const res = await fetch('/api/survey/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: { title: sectionTitle, pillar, questions: questionData },
          timing: { elapsedMinutes, sectionsCompleted, totalSections },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate summary');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              fullText += parsed.text;
              setContent(fullText);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      // Cache the result
      summaryCache.set(cacheKey, fullText);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Summary failed');
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [sectionId, sectionTitle, pillar, answeredQuestions, answers, answerKey, startedAt, sectionsCompleted, totalSections]);

  // Auto-trigger when there are answers
  useEffect(() => {
    if (hasAnswers && !hasTriggered.current && !content && !loading) {
      hasTriggered.current = true;
      generate();
    }
  }, [hasAnswers, content, loading, generate]);

  // Reset trigger flag when section changes
  useEffect(() => {
    hasTriggered.current = false;
    const cacheKey = `${sectionId}:${answerKey}`;
    const cached = summaryCache.get(cacheKey);
    if (cached) {
      setContent(cached);
      hasTriggered.current = true;
    } else {
      setContent('');
      setError(null);
    }
  }, [sectionId, answerKey]);

  if (!hasAnswers) return null;

  return (
    <div className="mt-6 border-t border-gray-100 pt-5">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-[#ECB421]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI Section Summary</span>
      </div>

      {loading && !content && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <div className="w-3.5 h-3.5 border-2 border-[#ECB421] border-t-transparent rounded-full animate-spin" />
          Summarising your responses...
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {content && (
        <div className="bg-[#FAFAF5] rounded-lg border border-gray-100 px-4 py-3 text-sm">
          {loading && (
            <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-400">
              <div className="w-2.5 h-2.5 border-2 border-[#ECB421] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <MarkdownRenderer content={content} />
        </div>
      )}
    </div>
  );
}
