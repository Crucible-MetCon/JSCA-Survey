import type { BranchingRule, BranchingCondition, SurveyAnswers } from '@/types';

/**
 * Evaluate a single branching condition against the current answers.
 */
function evaluateCondition(
  condition: BranchingCondition,
  answer: string | string[] | Record<string, number> | undefined
): boolean {
  if (answer === undefined || answer === null) return false;

  const { operator, value } = condition;

  // Handle string answers (single_choice, band_select, free_text)
  if (typeof answer === 'string') {
    switch (operator) {
      case 'equals':
        return answer === value;
      case 'not_equals':
        return answer !== value;
      case 'includes':
        return answer === value;
      case 'not_includes':
        return answer !== value;
      default:
        return false;
    }
  }

  // Handle array answers (multi_choice)
  if (Array.isArray(answer)) {
    switch (operator) {
      case 'equals':
        return answer.length === 1 && answer[0] === value;
      case 'not_equals':
        return !(answer.length === 1 && answer[0] === value);
      case 'includes':
        return answer.includes(value);
      case 'not_includes':
        return !answer.includes(value);
      default:
        return false;
    }
  }

  // Handle percentage split answers (object with keys)
  if (typeof answer === 'object') {
    const numericValue = parseFloat(value);
    switch (operator) {
      case 'equals':
        return Object.values(answer).some((v) => v === numericValue);
      case 'not_equals':
        return !Object.values(answer).some((v) => v === numericValue);
      default:
        return false;
    }
  }

  return false;
}

export interface BranchingResult {
  hiddenSectionIds: Set<string>;
  skippedSectionIds: Set<string>;
  skippedQuestionIds: Set<string>;
  explanations: Map<string, string>;
}

/**
 * Evaluate all branching rules against the current set of answers.
 * Returns which sections and questions should be hidden/skipped.
 */
export function evaluateBranchingRules(
  rules: BranchingRule[],
  answers: SurveyAnswers
): BranchingResult {
  const result: BranchingResult = {
    hiddenSectionIds: new Set(),
    skippedSectionIds: new Set(),
    skippedQuestionIds: new Set(),
    explanations: new Map(),
  };

  for (const rule of rules) {
    const answer = answers[rule.source_question_id];
    const conditionMet = evaluateCondition(rule.condition, answer);

    if (conditionMet) {
      switch (rule.action) {
        case 'skip_section':
          if (rule.target_section_id) {
            result.skippedSectionIds.add(rule.target_section_id);
            if (rule.explanation) {
              result.explanations.set(rule.target_section_id, rule.explanation);
            }
          }
          break;
        case 'hide_section':
          if (rule.target_section_id) {
            result.hiddenSectionIds.add(rule.target_section_id);
            if (rule.explanation) {
              result.explanations.set(rule.target_section_id, rule.explanation);
            }
          }
          break;
        case 'skip_question':
          if (rule.target_question_id) {
            result.skippedQuestionIds.add(rule.target_question_id);
            if (rule.explanation) {
              result.explanations.set(rule.target_question_id, rule.explanation);
            }
          }
          break;
        case 'show_section':
          // show_section removes from hidden/skipped if condition is met
          if (rule.target_section_id) {
            result.hiddenSectionIds.delete(rule.target_section_id);
            result.skippedSectionIds.delete(rule.target_section_id);
          }
          break;
      }
    }
  }

  return result;
}

/**
 * Check if a specific section should be visible given the branching result.
 */
export function isSectionVisible(
  sectionId: string,
  branchingResult: BranchingResult
): boolean {
  return (
    !branchingResult.hiddenSectionIds.has(sectionId) &&
    !branchingResult.skippedSectionIds.has(sectionId)
  );
}

/**
 * Check if a specific question should be visible given the branching result.
 */
export function isQuestionVisible(
  questionId: string,
  branchingResult: BranchingResult
): boolean {
  return !branchingResult.skippedQuestionIds.has(questionId);
}
