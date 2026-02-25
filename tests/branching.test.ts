import { describe, it, expect } from 'vitest';
import { evaluateBranchingRules, isSectionVisible, isQuestionVisible } from '../src/lib/branching';
import type { BranchingRule, SurveyAnswers } from '../src/types';

describe('Branching Rule Evaluation', () => {
  const sectionA = 'section-a-id';
  const sectionB = 'section-b-id';
  const questionX = 'question-x-id';
  const questionY = 'question-y-id';
  const questionZ = 'question-z-id';

  it('should skip a section when condition equals is met', () => {
    const rules: BranchingRule[] = [
      {
        id: 'rule-1',
        survey_id: 'survey-1',
        source_question_id: questionX,
        condition: { operator: 'equals', value: 'none' },
        action: 'skip_section',
        target_section_id: sectionB,
        target_question_id: null,
        explanation: 'You indicated none, so we skipped section B.',
      },
    ];

    const answers: SurveyAnswers = { [questionX]: 'none' };
    const result = evaluateBranchingRules(rules, answers);

    expect(result.skippedSectionIds.has(sectionB)).toBe(true);
    expect(isSectionVisible(sectionB, result)).toBe(false);
    expect(isSectionVisible(sectionA, result)).toBe(true);
    expect(result.explanations.get(sectionB)).toBe('You indicated none, so we skipped section B.');
  });

  it('should NOT skip section when condition is not met', () => {
    const rules: BranchingRule[] = [
      {
        id: 'rule-1',
        survey_id: 'survey-1',
        source_question_id: questionX,
        condition: { operator: 'equals', value: 'none' },
        action: 'skip_section',
        target_section_id: sectionB,
        target_question_id: null,
        explanation: null,
      },
    ];

    const answers: SurveyAnswers = { [questionX]: 'some_value' };
    const result = evaluateBranchingRules(rules, answers);

    expect(result.skippedSectionIds.has(sectionB)).toBe(false);
    expect(isSectionVisible(sectionB, result)).toBe(true);
  });

  it('should skip a question when condition is met', () => {
    const rules: BranchingRule[] = [
      {
        id: 'rule-2',
        survey_id: 'survey-1',
        source_question_id: questionX,
        condition: { operator: 'equals', value: 'not_applicable' },
        action: 'skip_question',
        target_section_id: null,
        target_question_id: questionY,
        explanation: 'Diamonds not applicable.',
      },
    ];

    const answers: SurveyAnswers = { [questionX]: 'not_applicable' };
    const result = evaluateBranchingRules(rules, answers);

    expect(result.skippedQuestionIds.has(questionY)).toBe(true);
    expect(isQuestionVisible(questionY, result)).toBe(false);
    expect(isQuestionVisible(questionZ, result)).toBe(true);
  });

  it('should handle multi-choice includes condition', () => {
    const rules: BranchingRule[] = [
      {
        id: 'rule-3',
        survey_id: 'survey-1',
        source_question_id: questionX,
        condition: { operator: 'includes', value: 'diamonds' },
        action: 'skip_question',
        target_section_id: null,
        target_question_id: questionZ,
        explanation: null,
      },
    ];

    // Multi-choice answer that includes "diamonds"
    const answers: SurveyAnswers = { [questionX]: ['gold', 'diamonds', 'silver'] };
    const result = evaluateBranchingRules(rules, answers);
    expect(result.skippedQuestionIds.has(questionZ)).toBe(true);

    // Multi-choice answer that does NOT include "diamonds"
    const answers2: SurveyAnswers = { [questionX]: ['gold', 'silver'] };
    const result2 = evaluateBranchingRules(rules, answers2);
    expect(result2.skippedQuestionIds.has(questionZ)).toBe(false);
  });

  it('should handle not_includes condition on array', () => {
    const rules: BranchingRule[] = [
      {
        id: 'rule-4',
        survey_id: 'survey-1',
        source_question_id: questionX,
        condition: { operator: 'not_includes', value: 'platinum' },
        action: 'hide_section',
        target_section_id: sectionA,
        target_question_id: null,
        explanation: null,
      },
    ];

    const answers: SurveyAnswers = { [questionX]: ['gold', 'silver'] };
    const result = evaluateBranchingRules(rules, answers);
    expect(result.hiddenSectionIds.has(sectionA)).toBe(true);
    expect(isSectionVisible(sectionA, result)).toBe(false);
  });

  it('should handle show_section action', () => {
    const rules: BranchingRule[] = [
      {
        id: 'rule-5',
        survey_id: 'survey-1',
        source_question_id: questionX,
        condition: { operator: 'equals', value: 'yes' },
        action: 'hide_section',
        target_section_id: sectionA,
        target_question_id: null,
        explanation: null,
      },
      {
        id: 'rule-6',
        survey_id: 'survey-1',
        source_question_id: questionY,
        condition: { operator: 'equals', value: 'override' },
        action: 'show_section',
        target_section_id: sectionA,
        target_question_id: null,
        explanation: null,
      },
    ];

    const answers: SurveyAnswers = { [questionX]: 'yes', [questionY]: 'override' };
    const result = evaluateBranchingRules(rules, answers);
    // show_section should remove it from hidden
    expect(isSectionVisible(sectionA, result)).toBe(true);
  });

  it('should handle undefined/unanswered question gracefully', () => {
    const rules: BranchingRule[] = [
      {
        id: 'rule-7',
        survey_id: 'survey-1',
        source_question_id: questionX,
        condition: { operator: 'equals', value: 'none' },
        action: 'skip_section',
        target_section_id: sectionA,
        target_question_id: null,
        explanation: null,
      },
    ];

    // No answer for questionX
    const result = evaluateBranchingRules(rules, {});
    expect(result.skippedSectionIds.has(sectionA)).toBe(false);
  });
});
