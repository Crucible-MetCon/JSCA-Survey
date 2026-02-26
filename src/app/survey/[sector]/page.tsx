'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import QuestionRenderer from '@/components/survey/QuestionRenderer';
import SectionSummary from '@/components/survey/SectionSummary';
import SubmissionReview from '@/components/survey/SubmissionReview';
import SurveyHelper from '@/components/survey/SurveyHelper';
import { evaluateBranchingRules, isSectionVisible, isQuestionVisible } from '@/lib/branching';
import { SECTOR_LABELS, PILLAR_LABELS } from '@/types';
import type { SurveyWithSections, SurveyAnswers, Sector, Pillar } from '@/types';

const STORAGE_KEY_PREFIX = 'jcsa_survey_progress_';

export default function SurveyPage() {
  const params = useParams();
  const router = useRouter();
  const sector = params.sector as Sector;

  const [survey, setSurvey] = useState<SurveyWithSections | null>(null);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageKey = STORAGE_KEY_PREFIX + sector;

  // Check methodology acknowledgement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const acknowledged = localStorage.getItem('jcsa_methodology_acknowledged');
      if (acknowledged !== 'true') {
        router.push(`/methodology?sector=${sector}`);
      }
    }
  }, [router, sector]);

  // Fetch survey
  useEffect(() => {
    async function fetchSurvey() {
      try {
        const res = await fetch(`/api/survey/${sector}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load survey');
        }
        const data: SurveyWithSections = await res.json();
        setSurvey(data);

        // Restore saved progress
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setAnswers(parsed.answers || {});
              setCurrentSectionIndex(parsed.sectionIndex || 0);
            } catch {
              // Ignore corrupt data
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load survey');
      } finally {
        setLoading(false);
      }
    }
    fetchSurvey();
  }, [sector, storageKey]);

  // Save progress to localStorage
  const saveProgress = useCallback(
    (newAnswers: SurveyAnswers, sectionIdx: number) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ answers: newAnswers, sectionIndex: sectionIdx })
        );
      }
    },
    [storageKey]
  );

  function handleAnswerChange(
    questionId: string,
    value: string | string[] | Record<string, number>
  ) {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    saveProgress(newAnswers, currentSectionIndex);
  }

  async function handleSubmit() {
    if (!survey) return;

    // Find size_band from the context section's first question
    const contextSection = survey.sections.find((s) => s.pillar === 'context');
    const sizeBandQuestion = contextSection?.questions[0];
    const sizeBand = sizeBandQuestion ? (answers[sizeBandQuestion.id] as string) : undefined;

    if (!sizeBand || sizeBand === 'prefer_not_to_answer') {
      setError('Please select your business size to continue.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          survey_id: survey.id,
          sector,
          size_band: sizeBand,
          answers,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Submission failed');
      }

      const result = await res.json();

      // Clear saved progress
      if (typeof window !== 'undefined') {
        localStorage.removeItem(storageKey);
      }

      // Redirect to completion page with receipt code
      router.push(`/complete?code=${encodeURIComponent(result.receipt_code)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-[#F5F5F0] min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#ECB421] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="bg-[#F5F5F0] min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="bg-white rounded-lg border border-red-200 p-8 max-w-md text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="text-[#1B2A4A] underline hover:text-[#ECB421]"
          >
            Return to home
          </button>
        </div>
      </div>
    );
  }

  if (!survey) return null;

  // Evaluate branching
  const branchingResult = evaluateBranchingRules(survey.branching_rules, answers);

  // Filter visible sections
  const visibleSections = survey.sections.filter((s) =>
    isSectionVisible(s.id, branchingResult)
  );

  const currentSection = visibleSections[currentSectionIndex];
  if (!currentSection) return null;

  const visibleQuestions = currentSection.questions.filter((q) =>
    isQuestionVisible(q.id, branchingResult)
  );

  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === visibleSections.length - 1;

  // Explanation for skipped sections
  const sectionExplanation = branchingResult.explanations.get(currentSection.id);

  return (
    <div className="bg-[#F5F5F0] min-h-[calc(100vh-140px)]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Survey header */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-1">
            {SECTOR_LABELS[sector]} &middot; {survey.year} Q{survey.quarter}
          </p>
          <h1 className="text-2xl font-bold text-[#1B2A4A]">{survey.title}</h1>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>
              {showReview
                ? 'Review'
                : `Section ${currentSectionIndex + 1} of ${visibleSections.length}`}
            </span>
            <span>
              {showReview
                ? 'Final Review'
                : PILLAR_LABELS[currentSection.pillar as Pillar]}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#ECB421] h-2 rounded-full transition-all duration-300"
              style={{
                width: showReview
                  ? '100%'
                  : `${((currentSectionIndex + 1) / visibleSections.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {showReview ? (
          /* Review step */
          <SubmissionReview
            survey={survey}
            answers={answers}
            sector={sector}
            branchingResult={branchingResult}
            onBack={() => {
              setShowReview(false);
              window.scrollTo(0, 0);
            }}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        ) : (
          <>
            {/* Section content */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-[#1B2A4A] mb-2">
                {currentSection.title}
              </h2>
              {currentSection.description && (
                <p className="text-sm text-gray-600 mb-6">{currentSection.description}</p>
              )}

              {sectionExplanation && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">{sectionExplanation}</p>
                </div>
              )}

              <div className="space-y-8">
                {visibleQuestions.map((question, idx) => {
                  const questionExplanation = branchingResult.explanations.get(question.id);
                  return (
                    <div key={question.id}>
                      <label className="block text-sm font-medium text-[#1B2A4A] mb-3">
                        {idx + 1}. {question.question_text}
                        {question.is_required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      {questionExplanation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <p className="text-xs text-blue-800">{questionExplanation}</p>
                        </div>
                      )}
                      <QuestionRenderer
                        question={question}
                        value={answers[question.id]}
                        onChange={handleAnswerChange}
                      />
                    </div>
                  );
                })}
              </div>

              {/* AI Section Summary */}
              <SectionSummary
                sectionId={currentSection.id}
                sectionTitle={currentSection.title}
                pillar={currentSection.pillar}
                questions={visibleQuestions}
                answers={answers}
              />
            </div>
          </>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Navigation (hidden during review — review has its own buttons) */}
        {!showReview && (
          <>
            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  const newIdx = currentSectionIndex - 1;
                  setCurrentSectionIndex(newIdx);
                  saveProgress(answers, newIdx);
                  window.scrollTo(0, 0);
                }}
                disabled={isFirstSection}
                className={`px-6 py-3 rounded-lg font-medium text-sm transition-colors ${
                  isFirstSection
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-[#1B2A4A] hover:border-[#ECB421]'
                }`}
              >
                Previous
              </button>

              {isLastSection ? (
                <button
                  onClick={() => {
                    setShowReview(true);
                    window.scrollTo(0, 0);
                  }}
                  className="px-8 py-3 rounded-lg font-semibold text-sm bg-[#ECB421] text-[#1B2A4A] hover:bg-[#d9a31e] transition-colors"
                >
                  Review &amp; Submit
                </button>
              ) : (
                <button
                  onClick={() => {
                    const newIdx = currentSectionIndex + 1;
                    setCurrentSectionIndex(newIdx);
                    saveProgress(answers, newIdx);
                    window.scrollTo(0, 0);
                  }}
                  className="px-6 py-3 rounded-lg font-medium text-sm bg-[#1B2A4A] text-white hover:bg-[#2a3d5e] transition-colors"
                >
                  Next Section
                </button>
              )}
            </div>

            {/* Section navigation dots */}
            <div className="flex justify-center gap-2 mt-6">
              {visibleSections.map((section, idx) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setCurrentSectionIndex(idx);
                    saveProgress(answers, idx);
                    window.scrollTo(0, 0);
                  }}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    idx === currentSectionIndex
                      ? 'bg-[#ECB421]'
                      : idx < currentSectionIndex
                        ? 'bg-[#1B2A4A]'
                        : 'bg-gray-300'
                  }`}
                  aria-label={`Go to section ${idx + 1}: ${section.title}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <SurveyHelper />
    </div>
  );
}
