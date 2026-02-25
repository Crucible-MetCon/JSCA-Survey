// JCSA Survey TypeScript Types

export type Sector =
  | 'manufacturers'
  | 'retailers'
  | 'wholesalers_importers'
  | 'diamond_dealers'
  | 'refiners';

export type QuestionType =
  | 'single_choice'
  | 'multi_choice'
  | 'percentage_split'
  | 'band_select'
  | 'free_text';

export type BranchingAction =
  | 'skip_section'
  | 'hide_section'
  | 'show_section'
  | 'skip_question';

export type Pillar =
  | 'context'
  | 'performance'
  | 'mix_volumes'
  | 'pricing_market'
  | 'constraints_outlook';

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionMetadata {
  max_selections?: number;
  total_must_equal_100?: boolean;
}

export interface BranchingCondition {
  operator: 'equals' | 'not_equals' | 'includes' | 'not_includes';
  value: string;
}

// Database row types

export interface Survey {
  id: string;
  title: string;
  year: number;
  quarter: number;
  sector: Sector;
  is_active: boolean;
  created_at: string;
}

export interface SurveySection {
  id: string;
  survey_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  pillar: Pillar;
}

export interface Question {
  id: string;
  section_id: string;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOption[] | null;
  is_required: boolean;
  sort_order: number;
  metadata: QuestionMetadata;
}

export interface BranchingRule {
  id: string;
  survey_id: string;
  source_question_id: string;
  condition: BranchingCondition;
  action: BranchingAction;
  target_section_id: string | null;
  target_question_id: string | null;
  explanation: string | null;
}

export interface Submission {
  id: string;
  survey_id: string;
  sector: Sector;
  year: number;
  quarter: number;
  size_band: string;
  submitted_at: string;
}

export interface Answer {
  id: string;
  submission_id: string;
  question_id: string;
  answer_value: string | null;
  answer_values: string[] | null;
  created_at: string;
}

export interface ReceiptCode {
  id: string;
  code_hash: string;
  submission_id: string;
  created_at: string;
}

export interface AggregateCache {
  id: string;
  cache_key: string;
  dimensions: Record<string, string | number>;
  result: Record<string, number>;
  response_count: number;
  computed_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  details: Record<string, unknown> | null;
  performed_at: string;
}

// API & Frontend types

export interface SurveyWithSections extends Survey {
  sections: SectionWithQuestions[];
  branching_rules: BranchingRule[];
}

export interface SectionWithQuestions extends SurveySection {
  questions: Question[];
}

export interface SurveyAnswers {
  [questionId: string]: string | string[] | Record<string, number>;
}

export interface SubmissionPayload {
  survey_id: string;
  sector: Sector;
  size_band: string;
  answers: SurveyAnswers;
}

export interface SubmissionResult {
  receipt_code: string;
  submitted_at: string;
}

export interface AggregatedResult {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  data: Record<string, number>;
  response_count: number;
  suppressed: boolean;
}

export interface DashboardFilters {
  year?: number;
  quarter?: number;
  sector?: Sector;
  size_band?: string;
}

export interface SessionData {
  adminId?: string;
  adminEmail?: string;
  isLoggedIn?: boolean;
}

export const SECTOR_LABELS: Record<Sector, string> = {
  manufacturers: 'Manufacturers',
  retailers: 'Retailers',
  wholesalers_importers: 'Wholesalers / Importers',
  diamond_dealers: 'Diamond Dealers',
  refiners: 'Refiners',
};

export const PILLAR_LABELS: Record<Pillar, string> = {
  context: 'Context',
  performance: 'Performance',
  mix_volumes: 'Mix & Volumes',
  pricing_market: 'Pricing & Market Signals',
  constraints_outlook: 'Constraints & Outlook',
};
