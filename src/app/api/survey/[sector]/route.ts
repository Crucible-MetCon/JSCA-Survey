import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Survey, SurveySection, Question, BranchingRule, SurveyWithSections, SectionWithQuestions } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sector: string }> }
) {
  const { sector } = await params;

  const validSectors = ['manufacturers', 'retailers', 'wholesalers_importers', 'diamond_dealers', 'refiners'];
  if (!validSectors.includes(sector)) {
    return NextResponse.json({ error: 'Invalid sector' }, { status: 400 });
  }

  try {
    // Get active survey for sector
    const surveys = await query<Survey>(
      'SELECT * FROM surveys WHERE sector = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1',
      [sector]
    );

    if (surveys.length === 0) {
      return NextResponse.json({ error: 'No active survey found for this sector' }, { status: 404 });
    }

    const survey = surveys[0];

    // Get sections
    const sections = await query<SurveySection>(
      'SELECT * FROM survey_sections WHERE survey_id = $1 ORDER BY sort_order',
      [survey.id]
    );

    // Get questions for all sections
    const sectionIds = sections.map((s) => s.id);
    let questions: Question[] = [];
    if (sectionIds.length > 0) {
      const placeholders = sectionIds.map((_, i) => `$${i + 1}`).join(',');
      questions = await query<Question>(
        `SELECT * FROM questions WHERE section_id IN (${placeholders}) ORDER BY sort_order`,
        sectionIds
      );
    }

    // Get branching rules
    const rules = await query<BranchingRule>(
      'SELECT * FROM branching_rules WHERE survey_id = $1',
      [survey.id]
    );

    // Assemble response
    const sectionsWithQuestions: SectionWithQuestions[] = sections.map((section) => ({
      ...section,
      questions: questions.filter((q) => q.section_id === section.id),
    }));

    const result: SurveyWithSections = {
      ...survey,
      sections: sectionsWithQuestions,
      branching_rules: rules,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error fetching survey:', err);
    return NextResponse.json({ error: 'Failed to load survey' }, { status: 500 });
  }
}
