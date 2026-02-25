'use client';

import type { Question, QuestionOption } from '@/types';

interface QuestionRendererProps {
  question: Question;
  value: string | string[] | Record<string, number> | undefined;
  onChange: (questionId: string, value: string | string[] | Record<string, number>) => void;
}

export default function QuestionRenderer({ question, value, onChange }: QuestionRendererProps) {
  const qId = question.id;

  switch (question.question_type) {
    case 'single_choice':
    case 'band_select':
      return (
        <SingleChoice
          question={question}
          value={value as string | undefined}
          onChange={(v) => onChange(qId, v)}
        />
      );
    case 'multi_choice':
      return (
        <MultiChoice
          question={question}
          value={value as string[] | undefined}
          onChange={(v) => onChange(qId, v)}
          maxSelections={question.metadata?.max_selections}
        />
      );
    case 'percentage_split':
      return (
        <PercentageSplit
          question={question}
          value={value as Record<string, number> | undefined}
          onChange={(v) => onChange(qId, v)}
        />
      );
    case 'free_text':
      return (
        <FreeText
          question={question}
          value={value as string | undefined}
          onChange={(v) => onChange(qId, v)}
        />
      );
    default:
      return null;
  }
}

// ─── Single Choice / Band Select ─────────────────────────────────────────────

function SingleChoice({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const options = question.options || [];

  return (
    <fieldset>
      <div className="space-y-2">
        {options.map((opt: QuestionOption) => (
          <label
            key={opt.value}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              value === opt.value
                ? 'border-[#ECB421] bg-[#ECB421]/5'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <input
              type="radio"
              name={question.id}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="w-4 h-4 accent-[#ECB421]"
            />
            <span className="text-sm text-gray-800">{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// ─── Multi Choice ────────────────────────────────────────────────────────────

function MultiChoice({
  question,
  value,
  onChange,
  maxSelections,
}: {
  question: Question;
  value: string[] | undefined;
  onChange: (value: string[]) => void;
  maxSelections?: number;
}) {
  const options = question.options || [];
  const selected = value || [];

  function handleToggle(optValue: string) {
    if (optValue === 'prefer_not_to_answer') {
      onChange(['prefer_not_to_answer']);
      return;
    }
    if (optValue === 'not_applicable') {
      onChange(['not_applicable']);
      return;
    }

    let newSelected = selected.filter(
      (v) => v !== 'prefer_not_to_answer' && v !== 'not_applicable'
    );

    if (newSelected.includes(optValue)) {
      newSelected = newSelected.filter((v) => v !== optValue);
    } else {
      if (maxSelections && newSelected.length >= maxSelections) {
        return;
      }
      newSelected.push(optValue);
    }
    onChange(newSelected);
  }

  return (
    <fieldset>
      {maxSelections && (
        <p className="text-xs text-gray-500 mb-2">
          Select up to {maxSelections} option{maxSelections > 1 ? 's' : ''}
        </p>
      )}
      <div className="space-y-2">
        {options.map((opt: QuestionOption) => {
          const isSelected = selected.includes(opt.value);
          const isDisabled =
            maxSelections &&
            !isSelected &&
            selected.length >= maxSelections &&
            opt.value !== 'prefer_not_to_answer' &&
            opt.value !== 'not_applicable';

          return (
            <label
              key={opt.value}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'border-[#ECB421] bg-[#ECB421]/5'
                  : isDisabled
                    ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={!!isDisabled}
                onChange={() => handleToggle(opt.value)}
                className="w-4 h-4 accent-[#ECB421]"
              />
              <span className="text-sm text-gray-800">{opt.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ─── Percentage Split ────────────────────────────────────────────────────────

function PercentageSplit({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: Record<string, number> | undefined;
  onChange: (value: Record<string, number>) => void;
}) {
  const options = (question.options || []).filter(
    (opt: QuestionOption) => opt.value !== 'prefer_not_to_answer'
  );
  const splits = value || {};
  const total = Object.values(splits).reduce((sum, v) => sum + (v || 0), 0);
  const isOver = total > 100;

  function handleChange(optValue: string, numValue: number) {
    const newSplits = { ...splits, [optValue]: Math.max(0, Math.min(100, numValue)) };
    onChange(newSplits);
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">Percentages should total approximately 100%</p>
      <div className="space-y-3">
        {options.map((opt: QuestionOption) => (
          <div key={opt.value} className="flex items-center gap-3">
            <label className="flex-1 text-sm text-gray-800 min-w-0">{opt.label}</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={splits[opt.value] ?? ''}
                onChange={(e) => handleChange(opt.value, parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-center text-sm focus:border-[#ECB421] focus:outline-none"
                placeholder="0"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>
        ))}
      </div>
      <div className={`mt-3 text-sm font-medium ${isOver ? 'text-red-600' : total === 100 ? 'text-green-600' : 'text-gray-500'}`}>
        Total: {total}%
        {isOver && ' (exceeds 100%)'}
      </div>
    </div>
  );
}

// ─── Free Text ───────────────────────────────────────────────────────────────

function FreeText({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
        Do not include names or identifying details.
      </p>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        maxLength={1000}
        className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:border-[#ECB421] focus:outline-none resize-vertical"
        placeholder="Optional — share your thoughts here..."
      />
      <p className="text-xs text-gray-400 mt-1">{(value || '').length}/1000 characters</p>
    </div>
  );
}
