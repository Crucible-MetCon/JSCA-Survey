'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import MarkdownRenderer from '@/components/admin/MarkdownRenderer';
import type { SurveyWithSections, SurveyAnswers, Sector } from '@/types';
import { SECTOR_LABELS } from '@/types';
import { isSectionVisible, isQuestionVisible } from '@/lib/branching';
import type { BranchingResult } from '@/lib/branching';

interface SubmissionReviewProps {
  survey: SurveyWithSections;
  answers: SurveyAnswers;
  sector: Sector;
  branchingResult: BranchingResult;
  startedAt: number;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

export default function SubmissionReview({
  survey,
  answers,
  sector,
  branchingResult,
  startedAt,
  onBack,
  onSubmit,
  submitting,
}: SubmissionReviewProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setContent('');
    setError(null);
    setLoading(true);

    try {
      const visibleSections = survey.sections.filter((s) =>
        isSectionVisible(s.id, branchingResult)
      );

      const sections = visibleSections.map((section) => {
        const visibleQuestions = section.questions.filter((q) =>
          isQuestionVisible(q.id, branchingResult)
        );

        return {
          title: section.title,
          pillar: section.pillar,
          questions: visibleQuestions.map((q) => ({
            text: q.question_text,
            type: q.question_type,
            answer: answers[q.id] ?? null,
            options: q.options || undefined,
          })),
        };
      });

      const elapsedMinutes = Math.round((Date.now() - startedAt) / 60000);

      const res = await fetch('/api/survey/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full: { sector: SECTOR_LABELS[sector], sections },
          timing: { elapsedMinutes, sectionsCompleted: visibleSections.length, totalSections: visibleSections.length },
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
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Summary failed');
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [survey, answers, sector, branchingResult, startedAt]);

  // Auto-generate on mount
  useEffect(() => {
    generate();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [generate]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-[#ECB421]/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-[#ECB421]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[#1B2A4A]">Review Your Submission</h2>
          <p className="text-sm text-gray-500">Here is an AI-generated summary of your responses.</p>
        </div>
      </div>

      {loading && !content && (
        <div className="flex items-center gap-3 text-gray-500 py-8 justify-center">
          <div className="w-5 h-5 border-2 border-[#ECB421] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Preparing your submission summary...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {content && (
        <div className="bg-[#FAFAF5] rounded-lg border border-gray-100 px-5 py-4 mb-6">
          {loading && (
            <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
              <div className="w-3 h-3 border-2 border-[#ECB421] border-t-transparent rounded-full animate-spin" />
              Generating...
            </div>
          )}
          <MarkdownRenderer content={content} />
        </div>
      )}

      {!loading && content && (
        <p className="text-xs text-gray-400 mb-6">
          This summary is AI-generated for your convenience. Your actual responses are what will be recorded.
        </p>
      )}

      <div className="flex justify-between pt-2 border-t border-gray-100">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg font-medium text-sm bg-white border border-gray-300 text-[#1B2A4A] hover:border-[#ECB421] transition-colors"
        >
          Edit Responses
        </button>
        <button
          onClick={onSubmit}
          disabled={submitting || loading}
          className="px-8 py-3 rounded-lg font-semibold text-sm bg-[#ECB421] text-[#1B2A4A] hover:bg-[#d9a31e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Survey'}
        </button>
      </div>
    </div>
  );
}
