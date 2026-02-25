'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function MethodologyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sector = searchParams.get('sector');

  function handleContinue() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('jcsa_methodology_acknowledged', 'true');
    }
    if (sector) {
      router.push(`/survey/${sector}`);
    } else {
      router.push('/');
    }
  }

  return (
    <div className="bg-[#F5F5F0] min-h-[calc(100vh-140px)]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-[#1B2A4A] mb-8">
          Anonymity &amp; Methodology
        </h1>

        <div className="bg-white rounded-lg border border-gray-200 p-8 space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1B2A4A] mb-3">
              1. What We Collect
            </h2>
            <p className="text-gray-700 leading-relaxed">
              This survey collects only: your <strong>sector</strong>, the <strong>year and quarter</strong>,
              your business <strong>size band</strong> (employee count range), and your{' '}
              <strong>banded/structured answers</strong> to each question. All responses use
              pre-defined ranges or categories — never specific numbers.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1B2A4A] mb-3">
              2. What We Do NOT Collect
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>No names, company names, or personal identifiers</li>
              <li>No email addresses, phone numbers, or physical addresses</li>
              <li>No IP addresses or device fingerprints</li>
              <li>No tracking scripts, analytics cookies, or third-party trackers</li>
              <li>No VAT numbers, bank details, or financial account information</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1B2A4A] mb-3">
              3. How Aggregation Works
            </h2>
            <p className="text-gray-700 leading-relaxed">
              All data is reported in <strong>aggregated form only</strong>. Results are
              presented as trends across sectors, year-on-year (YoY) and quarter-on-quarter (QoQ)
              comparisons. No individual submission is ever disclosed or identifiable.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1B2A4A] mb-3">
              4. k-Anonymity Threshold
            </h2>
            <p className="text-gray-700 leading-relaxed">
              We enforce a minimum response threshold (k-anonymity). If any data slice has
              fewer than <strong>5 responses</strong>, that metric is suppressed entirely and
              not displayed. This prevents identification of individual respondents through
              small group analysis.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1B2A4A] mb-3">
              5. Data Retention Policy
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Structured responses (banded answers) are retained for <strong>5 years</strong></li>
              <li>Optional free-text responses are retained for a maximum of <strong>12 months</strong> (configurable)</li>
              <li>After the retention period, data is permanently deleted</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-semibold text-[#1B2A4A] mb-3">
              6. Receipt Code
            </h2>
            <p className="text-gray-700 leading-relaxed">
              After submission, you receive a unique receipt code. This code proves your
              participation and grants access to aggregated results. The code is{' '}
              <strong>not linked to your identity</strong> — we store only a one-way hash.
              The code cannot be used to retrieve or identify your individual responses.
            </p>
          </section>

          {/* Continue button */}
          {sector && (
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleContinue}
                className="w-full sm:w-auto bg-[#ECB421] text-[#1B2A4A] font-semibold px-8 py-3 rounded-lg hover:bg-[#d9a31e] transition-colors"
              >
                I Have Read &amp; Understood — Continue to Survey
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MethodologyPage() {
  return (
    <Suspense fallback={<div className="bg-[#F5F5F0] min-h-[calc(100vh-140px)] flex items-center justify-center"><p>Loading...</p></div>}>
      <MethodologyContent />
    </Suspense>
  );
}
