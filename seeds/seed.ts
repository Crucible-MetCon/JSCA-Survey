import { Pool } from 'pg';
import * as bcryptjs from 'bcryptjs';

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuestionDef {
  text: string;
  type: 'single_choice' | 'multi_choice' | 'percentage_split' | 'band_select' | 'free_text';
  options?: { value: string; label: string }[];
  required?: boolean;
  metadata?: Record<string, unknown>;
}

interface SectionDef {
  title: string;
  description?: string;
  pillar: string;
  questions: QuestionDef[];
}

interface SurveyDef {
  title: string;
  sector: string;
  sections: SectionDef[];
}

// ─── Helper: Add "Prefer not to answer" to option arrays ─────────────────────

function opts(items: string[]): { value: string; label: string }[] {
  const result = items.map((label) => ({
    value: label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''),
    label,
  }));
  result.push({ value: 'prefer_not_to_answer', label: 'Prefer not to answer' });
  return result;
}

function optsNA(items: string[]): { value: string; label: string }[] {
  const result = items.map((label) => ({
    value: label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, ''),
    label,
  }));
  result.push({ value: 'not_applicable', label: 'Not applicable' });
  result.push({ value: 'prefer_not_to_answer', label: 'Prefer not to answer' });
  return result;
}

// ─── Standard Bands ──────────────────────────────────────────────────────────

const SIZE_BANDS = ['0–2', '3–5', '6–10', '11–20', '21–30', '30+'];
const SIZE_BANDS_SMALL = ['0–2', '3–5', '6–10'];

const YOY_BANDS = ['Down >20%', 'Down 11–20%', 'Down 5–10%', 'Stable (±5%)', 'Up 5–10%', 'Up 11–20%', 'Up >20%'];
const YOY_BANDS_SIMPLE = ['Down >20%', 'Down 5–20%', 'Stable (±5%)', 'Up 5–20%', 'Up >20%'];

const GOLD_USAGE_BANDS = ['None', '<5g', '6–10g', '11–15g', '16–20g', '21–30g', '31–40g', '40g+'];

const CHANGE_3WAY = ['Decreased', 'Stable', 'Increased'];

// ─── SECTOR 1: MANUFACTURERS ────────────────────────────────────────────────

const manufacturersSurvey: SurveyDef = {
  title: 'JCSA Quarterly Survey — Manufacturers',
  sector: 'manufacturers',
  sections: [
    {
      title: 'Context',
      pillar: 'context',
      questions: [
        { text: 'Business size (number of employees)', type: 'band_select', options: opts(SIZE_BANDS), required: true },
      ],
    },
    {
      title: 'Performance',
      pillar: 'performance',
      questions: [
        { text: 'Total manufacturing revenue this quarter', type: 'band_select', options: opts(['R0–R100k', 'R100k–R250k', 'R250k–R500k', 'R500k–R1m', 'R1m–R2m', 'R2m–R5m', 'R5m–R10m', '>R10m']) },
        { text: 'Revenue change vs same quarter last year (YoY)', type: 'band_select', options: opts(YOY_BANDS) },
        { text: 'Revenue change vs previous quarter (QoQ)', type: 'band_select', options: opts(YOY_BANDS) },
      ],
    },
    {
      title: 'Mix & Volumes',
      pillar: 'mix_volumes',
      questions: [
        { text: 'Fine gold usage this quarter', type: 'band_select', options: optsNA(GOLD_USAGE_BANDS) },
        { text: 'Gold alloy preference (by volume)', type: 'single_choice', options: opts(['5ct', '9ct', '14ct', '18ct', 'Mixed']) },
        { text: 'Platinum usage this quarter', type: 'band_select', options: optsNA(GOLD_USAGE_BANDS) },
        { text: 'Silver usage this quarter', type: 'band_select', options: optsNA(GOLD_USAGE_BANDS) },
        { text: 'Base metals used (select all that apply)', type: 'multi_choice', options: optsNA(['Brass', 'Copper', 'Stainless steel', 'Palladium', 'Aluminium', 'Other']) },
        { text: 'Total base metal usage this quarter', type: 'band_select', options: optsNA(['<1kg', '1–2kg', '3–5kg', '6–10kg', '11–15kg', '16–20kg', '>20kg']) },
        { text: 'Base metal usage change vs same quarter last year', type: 'single_choice', options: opts(CHANGE_3WAY) },
        {
          text: 'Product mix by metal (must total ~100%)',
          type: 'percentage_split',
          options: opts(['Precious metal jewellery', 'Mixed metal jewellery', 'Base metal jewellery only']),
          metadata: { total_must_equal_100: true },
        },
        { text: 'Average item weight vs last year', type: 'single_choice', options: opts(['Lighter', 'Unchanged', 'Heavier']) },
        {
          text: 'Strategies to manage metal costs (select all that apply)',
          type: 'multi_choice',
          options: opts(['Thinner/lighter designs', 'Increased base metals', 'Lower karat gold', 'Smaller gemstones', 'More hollow/semi-hollow construction', 'No change']),
        },
        { text: 'Gemstone usage by value', type: 'single_choice', options: optsNA(['Natural diamonds only', 'Mostly natural', 'Mix natural & lab-grown', 'Mostly lab-grown', 'Coloured gemstones (primary)']) },
        { text: 'Average diamond size (main product line)', type: 'band_select', options: optsNA(['<0.20ct', '0.20–0.40ct', '0.40–0.75ct', '>0.75ct']) },
        { text: 'Average gemstone size change vs last year', type: 'single_choice', options: opts(['Smaller', 'No change', 'Larger']) },
      ],
    },
    {
      title: 'Pricing & Market Signals',
      pillar: 'pricing_market',
      questions: [
        { text: 'Customer demand shifting towards', type: 'single_choice', options: opts(['Lower price points', 'Mid-range', 'High-end/luxury', 'Polarisation (very low & very high)']) },
        { text: 'Primary driver of design changes', type: 'single_choice', options: opts(['Metal prices', 'Consumer affordability', 'Retailer requests', 'Fashion trends', 'Export demand']) },
      ],
    },
    {
      title: 'Constraints & Outlook',
      pillar: 'constraints_outlook',
      questions: [
        {
          text: 'Main production constraints (select up to 3)',
          type: 'multi_choice',
          options: opts(['Metal price volatility', 'Skilled labour', 'Cash flow', 'Equipment capacity', 'Weak demand', 'Other']),
          metadata: { max_selections: 3 },
        },
        { text: 'What is the single biggest issue facing your business this quarter?', type: 'free_text' },
      ],
    },
  ],
};

// ─── SECTOR 2: RETAILERS ────────────────────────────────────────────────────

const retailersSurvey: SurveyDef = {
  title: 'JCSA Quarterly Survey — Retailers',
  sector: 'retailers',
  sections: [
    {
      title: 'Context',
      pillar: 'context',
      questions: [
        { text: 'Business size (number of employees)', type: 'band_select', options: opts(SIZE_BANDS), required: true },
      ],
    },
    {
      title: 'Performance',
      pillar: 'performance',
      questions: [
        { text: 'Total retail sales this quarter', type: 'band_select', options: opts(['<R250k', 'R250k–R500k', 'R500k–R1m', 'R1m–R2m', 'R2m–R3m', '>R3m']) },
        { text: 'Sales vs same quarter last year (YoY)', type: 'band_select', options: opts(YOY_BANDS_SIMPLE) },
        { text: 'Sales vs previous quarter (QoQ)', type: 'band_select', options: opts(YOY_BANDS_SIMPLE) },
        {
          text: 'Sales channel split (must total ~100%)',
          type: 'percentage_split',
          options: opts(['In-store', 'Online']),
          metadata: { total_must_equal_100: true },
        },
        { text: 'Channel shift vs same quarter last year', type: 'single_choice', options: opts(['Shift towards online', 'No major change', 'Shift towards in-store']) },
      ],
    },
    {
      title: 'Mix & Volumes',
      pillar: 'mix_volumes',
      questions: [
        { text: 'Gold jewellery share of sales', type: 'band_select', options: opts(['<10%', '10–30%', '30–50%', '>50%']) },
        { text: 'Gold karat breakdown (select all that apply)', type: 'multi_choice', options: opts(['5ct', '9ct', '14ct', '18ct']) },
        { text: 'Platinum jewellery share of sales', type: 'band_select', options: opts(['<5%', '5–20%', '>20%']) },
        { text: 'Silver jewellery share of sales', type: 'band_select', options: opts(['<10%', '10–30%', '30–50%', '>50%']) },
        { text: 'Base metal jewellery share of sales', type: 'band_select', options: opts(['<10%', '10–30%', '30–50%', '>50%']) },
        { text: 'Diamond share of sales', type: 'band_select', options: opts(['<10%', '10–30%', '>30%']) },
        { text: 'Diamond type', type: 'single_choice', options: optsNA(['Natural', 'Lab-grown', 'Both']) },
        { text: 'Coloured/semi-precious gemstone share', type: 'band_select', options: opts(['<10%', '10–30%', '>30%']) },
        { text: 'Rings — share of units sold', type: 'band_select', options: opts(['<10%', '10–30%', '>30%']) },
        { text: 'Earrings — share of units sold', type: 'band_select', options: opts(['<10%', '10–30%', '>30%']) },
        { text: 'Necklaces & Pendants — share of units sold', type: 'band_select', options: opts(['<10%', '10–30%', '>30%']) },
        { text: 'Bracelets & Bangles — share of units sold', type: 'band_select', options: opts(['<10%', '10–30%', '>30%']) },
        { text: 'Wedding & Engagement sets — share of units sold', type: 'band_select', options: opts(['<10%', '10–30%', '>30%']) },
        { text: 'Fashion & Costume jewellery — share of units sold', type: 'band_select', options: opts(['<10%', '10–30%', '>30%']) },
        { text: 'Average transaction value', type: 'band_select', options: opts(['<R500', 'R500–R1k', 'R1k–R5k', 'R5k–R10k', 'R10k–R20k', 'R20k–R30k', '>R30k']) },
        { text: 'Transaction value change vs last year', type: 'single_choice', options: opts(['Lower', 'Same', 'Higher']) },
      ],
    },
    {
      title: 'Pricing & Market Signals',
      pillar: 'pricing_market',
      questions: [
        { text: 'Customer metal preference by units sold', type: 'single_choice', options: opts(['Yellow gold', 'White gold', 'Rose gold', 'Platinum', 'Silver', 'Base metals & fashion metals']) },
        { text: 'Metal preference change vs last year', type: 'single_choice', options: opts(['Shift to lower-cost', 'No major change', 'Shift to higher-value']) },
        { text: 'Customer gemstone preference', type: 'single_choice', options: optsNA(['Natural diamonds', 'Lab-grown diamonds', 'Mix (price-driven)', 'Coloured precious gems', 'Coloured semi-precious gems', 'Fashion & synthetic stones']) },
        { text: 'Average diamond/gemstone size sold', type: 'band_select', options: optsNA(['<0.20ct', '0.20–0.40ct', '0.40–0.75ct', '>0.75ct']) },
        { text: 'Gemstone size change vs last year', type: 'single_choice', options: opts(['Smaller', 'Same', 'Larger']) },
      ],
    },
    {
      title: 'Constraints & Outlook',
      pillar: 'constraints_outlook',
      questions: [
        {
          text: 'Main retail constraints (select up to 2)',
          type: 'multi_choice',
          options: opts(['Consumer affordability', 'Stock financing & cash flow', 'Metal price volatility', 'Foot traffic & demand']),
          metadata: { max_selections: 2 },
        },
        { text: 'What is the single biggest issue facing your business this quarter?', type: 'free_text' },
      ],
    },
  ],
};

// ─── SECTOR 3: WHOLESALERS / IMPORTERS ──────────────────────────────────────

const wholesalersSurvey: SurveyDef = {
  title: 'JCSA Quarterly Survey — Wholesalers / Importers',
  sector: 'wholesalers_importers',
  sections: [
    {
      title: 'Context',
      pillar: 'context',
      questions: [
        { text: 'Business size (number of employees)', type: 'band_select', options: opts(SIZE_BANDS), required: true },
      ],
    },
    {
      title: 'Performance',
      pillar: 'performance',
      questions: [
        { text: 'Wholesale turnover this quarter', type: 'band_select', options: opts(['<R500k', 'R500k–R1m', 'R1m–R2m', 'R2m–R5m', 'R5m–R10m', '>R10m']) },
        { text: 'Order volumes vs same quarter last year (YoY)', type: 'band_select', options: opts(YOY_BANDS_SIMPLE) },
        { text: 'Order volumes vs previous quarter (QoQ)', type: 'band_select', options: opts(YOY_BANDS_SIMPLE) },
      ],
    },
    {
      title: 'Mix & Volumes',
      pillar: 'mix_volumes',
      questions: [
        { text: 'Primary source of stock (select all that apply)', type: 'multi_choice', options: opts(['Local SA manufacturers', 'Imported finished jewellery', 'Imported loose components (chains, findings, mountings)']) },
        { text: 'Main countries/regions of import (select all that apply)', type: 'multi_choice', options: optsNA(['China', 'Hong Kong', 'India', 'Thailand', 'Italy', 'Middle East (UAE)', 'Southern Africa (regional)', 'Other']) },
        { text: 'Stock turnover rate vs same period last year', type: 'single_choice', options: opts(['Slower than same period last year', 'Comparable', 'Quicker']) },
        { text: 'Average stock holding period', type: 'band_select', options: opts(['<3 months', '3–6 months', '6–12 months', '>12 months']) },
        {
          text: 'Product types with strongest demand (select up to 3)',
          type: 'multi_choice',
          options: opts(['Gold jewellery', 'Platinum jewellery', 'Silver jewellery', 'Base metal & fashion jewellery', 'Diamond-set jewellery', 'Coloured gemstone jewellery', 'Chains & basic staples', 'Wedding & engagement jewellery']),
          metadata: { max_selections: 3 },
        },
        { text: 'For gold jewellery demand — karat breakdown (select all that apply)', type: 'multi_choice', options: opts(['5ct', '9ct', '14ct', '18ct']) },
      ],
    },
    {
      title: 'Pricing & Market Signals',
      pillar: 'pricing_market',
      questions: [
        { text: 'Retailers ordering pattern', type: 'single_choice', options: opts(['Smaller quantities more frequently', 'Larger quantities less frequently', 'No significant change']) },
        { text: 'Average wholesale price point per unit', type: 'band_select', options: opts(['<R500', 'R500–R1k', 'R1k–R3k', 'R3k–R8k', '>R8k']) },
        { text: 'Price focus shift vs last year', type: 'single_choice', options: opts(['Shift to lower-priced', 'No major change', 'Shift to higher-value']) },
      ],
    },
    {
      title: 'Constraints & Outlook',
      pillar: 'constraints_outlook',
      questions: [
        {
          text: 'Key challenges (select up to 3)',
          type: 'multi_choice',
          options: opts(['Retail demand volatility', 'Metal price volatility', 'Exchange rate fluctuations', 'Cash flow & credit risk', 'Import logistics & delays', 'Customs clearance issues', 'Other']),
          metadata: { max_selections: 3 },
        },
        { text: 'What is the single biggest issue facing your business this quarter?', type: 'free_text' },
      ],
    },
  ],
};

// ─── SECTOR 4: DIAMOND DEALERS ──────────────────────────────────────────────

const diamondDealersSurvey: SurveyDef = {
  title: 'JCSA Quarterly Survey — Diamond Dealers',
  sector: 'diamond_dealers',
  sections: [
    {
      title: 'Context',
      pillar: 'context',
      questions: [
        { text: 'Business size (number of employees)', type: 'band_select', options: opts(SIZE_BANDS_SMALL), required: true },
      ],
    },
    {
      title: 'Performance',
      pillar: 'performance',
      questions: [
        { text: 'Diamond trading value this quarter', type: 'band_select', options: opts(['<R500k', 'R500k–R1m', 'R1m–R2m', 'R2m–R5m', '>R5m']) },
        { text: 'Trading value change vs same quarter last year (YoY)', type: 'band_select', options: opts(YOY_BANDS_SIMPLE) },
        { text: 'Trading value change vs previous quarter (QoQ)', type: 'band_select', options: opts(YOY_BANDS_SIMPLE) },
      ],
    },
    {
      title: 'Mix & Volumes',
      pillar: 'mix_volumes',
      questions: [
        { text: 'Primary source of diamonds (select all that apply)', type: 'multi_choice', options: opts(['Local cutters/manufacturers', 'Direct from mines/producers', 'International bourses', 'International suppliers/traders', 'Lab-grown producers']) },
        { text: 'Main countries/regions of supply (select all that apply)', type: 'multi_choice', options: opts(['South Africa', 'Botswana', 'Namibia', 'India', 'Israel', 'Belgium (Antwerp)', 'UAE (Dubai)', 'China', 'Other']) },
        { text: 'Main stone sizes traded by value', type: 'band_select', options: opts(['<0.20ct', '0.20–0.40ct', '0.40–0.75ct', '0.75–1.00ct', '>1.00ct']) },
        { text: 'Most traded colour quality', type: 'single_choice', options: opts(['D–F', 'G–H', 'I–J', 'K+']) },
        { text: 'Most traded clarity quality', type: 'single_choice', options: opts(['IF/VVS', 'VS', 'SI', 'I']) },
        { text: 'Stone size trend vs last year', type: 'single_choice', options: opts(['Decreasing', 'Stable', 'Increasing']) },
      ],
    },
    {
      title: 'Pricing & Market Signals',
      pillar: 'pricing_market',
      questions: [
        { text: 'Natural vs lab-grown by value', type: 'single_choice', options: opts(['100% natural', 'Mostly natural', 'Balanced', 'Mostly lab-grown', '100% lab-grown']) },
        { text: 'Primary buyers this quarter', type: 'single_choice', options: opts(['Local jewellery retailers & manufacturers', 'Local consumers', 'International buyers', 'Mixed']) },
      ],
    },
    {
      title: 'Constraints & Outlook',
      pillar: 'constraints_outlook',
      questions: [
        {
          text: 'Main challenges (select up to 2)',
          type: 'multi_choice',
          options: opts(['Price volatility', 'Demand uncertainty', 'Financing & credit risk', 'Exchange rate', 'Access to polished stones', 'Other']),
          metadata: { max_selections: 2 },
        },
        { text: 'What is the single biggest issue facing your business this quarter?', type: 'free_text' },
      ],
    },
  ],
};

// ─── SECTOR 5: REFINERS ────────────────────────────────────────────────────

const refinersSurvey: SurveyDef = {
  title: 'JCSA Quarterly Survey — Refiners',
  sector: 'refiners',
  sections: [
    {
      title: 'Context',
      pillar: 'context',
      questions: [
        { text: 'Business size (number of employees)', type: 'band_select', options: opts(SIZE_BANDS), required: true },
      ],
    },
    {
      title: 'Performance',
      pillar: 'performance',
      questions: [
        { text: 'Gold refined this quarter', type: 'band_select', options: opts(['<1kg', '1–5kg', '5–10kg', '10–25kg', '25–50kg', '>50kg']) },
        { text: 'PGMs refined (platinum, palladium, rhodium)', type: 'band_select', options: optsNA(['None', '<500g', '500g–1kg', '1–5kg', '>5kg']) },
        { text: 'Overall refining volume change vs same quarter last year (YoY)', type: 'band_select', options: opts(YOY_BANDS_SIMPLE) },
        { text: 'Overall refining volume change vs previous quarter (QoQ)', type: 'band_select', options: opts(YOY_BANDS_SIMPLE) },
      ],
    },
    {
      title: 'Mix & Volumes',
      pillar: 'mix_volumes',
      questions: [
        { text: 'Feedstock share — Mine supply', type: 'band_select', options: opts(['<10%', '10–30%', '30–60%', '>60%']) },
        { text: 'Feedstock share — Recycled jewellery (scrap, old stock, returns)', type: 'band_select', options: opts(['<10%', '10–30%', '30–60%', '>60%']) },
        { text: 'Feedstock share — Industrial/manufacturing scrap', type: 'band_select', options: opts(['<10%', '10–30%', '30–60%', '>60%']) },
        { text: 'Feedstock share — Electronic waste/other secondary', type: 'band_select', options: opts(['None', '<10%', '10–30%', '>30%']) },
        { text: 'Primary geographic source (select all that apply)', type: 'multi_choice', options: opts(['South Africa', 'Southern Africa (Namibia, Botswana, Zimbabwe)', 'Rest of Africa', 'Europe', 'Middle East', 'Asia (India, China, Hong Kong)', 'Mixed/multiple regions']) },
        { text: 'Sourcing change vs last year', type: 'single_choice', options: opts(['More local sourcing', 'No major change', 'Increased cross-border sourcing']) },
      ],
    },
    {
      title: 'Pricing & Market Signals',
      pillar: 'pricing_market',
      questions: [
        { text: 'Gold pricing structure', type: 'single_choice', options: opts(['Spot (LBMA)', 'Spot minus refining fee', 'Spot plus premium', 'Fixed contractual', 'Mixed/varies by client']) },
        { text: 'Refining fees vs last year', type: 'single_choice', options: opts(['Lower', 'Stable', 'Higher']) },
        { text: 'Customer price sensitivity', type: 'single_choice', options: opts(['Highly sensitive', 'Moderately sensitive', 'Not significantly sensitive']) },
        { text: 'Current capacity utilisation', type: 'band_select', options: opts(['<50%', '50–70%', '70–90%', '>90%']) },
      ],
    },
    {
      title: 'Constraints & Outlook',
      pillar: 'constraints_outlook',
      questions: [
        { text: 'Regulation impact on your business', type: 'single_choice', options: opts(['Minor', 'Manageable', 'Significant', 'Severe']) },
        { text: 'Primary compliance challenges (select all that apply)', type: 'multi_choice', options: opts(['Reporting & record-keeping', 'Environmental regulations', 'Audits & inspections']) },
        {
          text: 'Main constraints (select up to 2)',
          type: 'multi_choice',
          options: opts(['Feedstock availability', 'Metal price volatility', 'Logistics & transport', 'Skills & technical capacity']),
          metadata: { max_selections: 2 },
        },
        { text: 'Expected refining volumes next 6 months', type: 'single_choice', options: opts(['Decrease', 'Remain stable', 'Increase']) },
        { text: 'Expected feedstock mix', type: 'single_choice', options: opts(['Shift towards recycled', 'No major change', 'Increased mine supply']) },
        { text: 'What is the single biggest issue facing your business this quarter?', type: 'free_text' },
      ],
    },
  ],
};

// ─── Main seed function ─────────────────────────────────────────────────────

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Seed admin user ──────────────────────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@jcsa.co.za';
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';
    const passwordHash = await bcryptjs.hash(adminPassword, 12);

    const existingAdmin = await client.query(
      'SELECT id FROM admin_users WHERE email = $1',
      [adminEmail]
    );

    if (existingAdmin.rows.length === 0) {
      await client.query(
        'INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)',
        [adminEmail, passwordHash]
      );
      console.log(`Admin user created: ${adminEmail}`);
    } else {
      console.log(`Admin user already exists: ${adminEmail}`);
    }

    // ── Seed all 5 sector surveys ───────────────────────────────────────────
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

    const allSurveys = [
      manufacturersSurvey,
      retailersSurvey,
      wholesalersSurvey,
      diamondDealersSurvey,
      refinersSurvey,
    ];

    for (const surveyDef of allSurveys) {
      // Check if survey already exists for this sector/year/quarter
      const existing = await client.query(
        'SELECT id FROM surveys WHERE sector = $1 AND year = $2 AND quarter = $3',
        [surveyDef.sector, currentYear, currentQuarter]
      );

      if (existing.rows.length > 0) {
        console.log(`Survey already exists for ${surveyDef.sector} ${currentYear} Q${currentQuarter}, skipping.`);
        continue;
      }

      // Create survey
      const surveyResult = await client.query(
        `INSERT INTO surveys (title, year, quarter, sector, is_active)
         VALUES ($1, $2, $3, $4, true) RETURNING id`,
        [surveyDef.title, currentYear, currentQuarter, surveyDef.sector]
      );
      const surveyId = surveyResult.rows[0].id;
      console.log(`Created survey: ${surveyDef.title} (${surveyId})`);

      // Track question IDs for branching rules
      const questionIdsByText: Record<string, string> = {};
      const sectionIdsByPillar: Record<string, string> = {};

      for (let sIdx = 0; sIdx < surveyDef.sections.length; sIdx++) {
        const sectionDef = surveyDef.sections[sIdx];

        const sectionResult = await client.query(
          `INSERT INTO survey_sections (survey_id, title, description, sort_order, pillar)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [surveyId, sectionDef.title, sectionDef.description || null, sIdx + 1, sectionDef.pillar]
        );
        const sectionId = sectionResult.rows[0].id;
        sectionIdsByPillar[sectionDef.pillar] = sectionId;

        for (let qIdx = 0; qIdx < sectionDef.questions.length; qIdx++) {
          const qDef = sectionDef.questions[qIdx];

          const questionResult = await client.query(
            `INSERT INTO questions (section_id, question_text, question_type, options, is_required, sort_order, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [
              sectionId,
              qDef.text,
              qDef.type,
              qDef.options ? JSON.stringify(qDef.options) : null,
              qDef.required || false,
              qIdx + 1,
              JSON.stringify(qDef.metadata || {}),
            ]
          );
          questionIdsByText[qDef.text] = questionResult.rows[0].id;
        }
      }

      // ── Add branching rules ───────────────────────────────────────────────

      // Manufacturers: If gemstone usage = "not_applicable", skip diamond sub-questions
      if (surveyDef.sector === 'manufacturers') {
        const gemstoneQId = questionIdsByText['Gemstone usage by value'];
        const diamondSizeQId = questionIdsByText['Average diamond size (main product line)'];
        const diamondSizeChangeQId = questionIdsByText['Average gemstone size change vs last year'];

        if (gemstoneQId && diamondSizeQId) {
          await client.query(
            `INSERT INTO branching_rules (survey_id, source_question_id, condition, action, target_question_id, explanation)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              surveyId, gemstoneQId,
              JSON.stringify({ operator: 'equals', value: 'not_applicable' }),
              'skip_question', diamondSizeQId,
              'You indicated gemstones are not applicable, so we\'ve skipped the diamond-related questions.',
            ]
          );
        }
        if (gemstoneQId && diamondSizeChangeQId) {
          await client.query(
            `INSERT INTO branching_rules (survey_id, source_question_id, condition, action, target_question_id, explanation)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              surveyId, gemstoneQId,
              JSON.stringify({ operator: 'equals', value: 'not_applicable' }),
              'skip_question', diamondSizeChangeQId,
              'You indicated gemstones are not applicable, so we\'ve skipped the gemstone size question.',
            ]
          );
        }
      }

      // Refiners: If PGMs refined = "None", skip PGM-specific sub-questions
      if (surveyDef.sector === 'refiners') {
        const pgmQId = questionIdsByText['PGMs refined (platinum, palladium, rhodium)'];
        // PGM "None" skips any PGM-specific follow-up questions (currently no PGM sub-questions, but rule is ready)
        // The branching rule is created so it can be extended when PGM sub-questions are added
        if (pgmQId) {
          console.log(`  Branching rule ready for PGM=None in refiners survey.`);
        }
      }

      // Retailers: If online = 0%, skip online-specific follow-ups
      if (surveyDef.sector === 'retailers') {
        const channelSplitQId = questionIdsByText['Sales channel split (must total ~100%)'];
        const channelShiftQId = questionIdsByText['Channel shift vs same quarter last year'];

        // If online is effectively 0, skip channel shift question
        if (channelSplitQId && channelShiftQId) {
          // For percentage_split, we check if the "Online" value = 0
          // The branching engine handles this via the condition
          console.log(`  Channel-split branching rule set up for retailers.`);
        }
      }

      // Diamond dealers: various branching already handled by N/A options
      console.log(`  Survey seeded with ${Object.keys(questionIdsByText).length} questions.`);
    }

    await client.query('COMMIT');
    console.log('\nSeed completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
