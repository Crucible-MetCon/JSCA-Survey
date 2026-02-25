'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { SECTOR_LABELS } from '@/types';
import type { Sector } from '@/types';

interface ResultItem {
  question_id: string;
  question_text: string;
  question_type: string;
  section_title: string;
  pillar: string;
  data: Record<string, number> | null;
  response_count: number;
  suppressed: boolean;
  suppression_message: string | null;
}

interface ResultsData {
  sector: Sector;
  year: number;
  quarter: number;
  results: ResultItem[];
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [code, setCode] = useState(initialCode);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/results/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Verification failed');
      }

      const data: ResultsData = await res.json();
      setResults(data);
      setVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  if (!verified || !results) {
    return (
      <div className="bg-[#F5F5F0] min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 py-12 w-full">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <Image
              src="/jcsa-logo.svg"
              alt="JCSA Logo"
              width={48}
              height={48}
              className="mx-auto mb-6"
            />
            <h1 className="text-xl font-bold text-[#1B2A4A] text-center mb-2">
              View Survey Results
            </h1>
            <p className="text-sm text-gray-600 text-center mb-6">
              Enter your receipt code to access aggregated results.
            </p>

            <form onSubmit={handleVerify} className="space-y-4">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="JCSA-2025Q1-XXXX-XXXX"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center font-mono tracking-wider focus:border-[#ECB421] focus:outline-none"
                maxLength={22}
              />
              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full bg-[#ECB421] text-[#1B2A4A] font-semibold py-3 rounded-lg hover:bg-[#d9a31e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'View Results'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Group results by section
  const sections = new Map<string, ResultItem[]>();
  for (const item of results.results) {
    const key = item.section_title;
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key)!.push(item);
  }

  return (
    <div className="bg-[#F5F5F0] min-h-[calc(100vh-140px)]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1B2A4A]">
            Survey Results
          </h1>
          <p className="text-gray-600">
            {SECTOR_LABELS[results.sector]} &middot; {results.year} Q{results.quarter}
          </p>
        </div>

        {Array.from(sections.entries()).map(([sectionTitle, items]) => (
          <div key={sectionTitle} className="mb-8">
            <h2 className="text-lg font-semibold text-[#1B2A4A] mb-4">
              {sectionTitle}
            </h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.question_id}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <h3 className="text-sm font-medium text-[#1B2A4A] mb-3">
                    {item.question_text}
                  </h3>
                  {item.suppressed ? (
                    <p className="text-sm text-gray-500 italic">
                      {item.suppression_message}
                    </p>
                  ) : item.data ? (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">
                        n={item.response_count}
                      </p>
                      <div className="space-y-2">
                        {Object.entries(item.data).map(([label, count]) => {
                          const total = Object.values(item.data!).reduce((s, v) => s + v, 0);
                          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                          return (
                            <div key={label}>
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>{label}</span>
                                <span>{pct}% ({count})</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                  className="bg-[#ECB421] h-2 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No data available.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="bg-[#F5F5F0] min-h-[calc(100vh-140px)] flex items-center justify-center"><p>Loading...</p></div>}>
      <ResultsContent />
    </Suspense>
  );
}
