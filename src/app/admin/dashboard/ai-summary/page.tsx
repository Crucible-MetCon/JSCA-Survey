'use client';

import { useState, useRef, useCallback } from 'react';
import DashboardFiltersBar from '@/components/admin/DashboardFilters';
import MarkdownRenderer from '@/components/admin/MarkdownRenderer';
import type { DashboardFilters } from '@/types';

export default function AISummaryPage() {
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generateSummary = useCallback(async () => {
    // Cancel any in-progress request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setContent('');
    setError(null);
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (filters.year) params.set('year', String(filters.year));
      if (filters.quarter) params.set('quarter', String(filters.quarter));
      if (filters.sector) params.set('sector', filters.sector);
      if (filters.size_band) params.set('size_band', filters.size_band);

      const res = await fetch(`/api/admin/summary?${params.toString()}`, {
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
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              setContent((prev) => prev + parsed.text);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [filters]);

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/summary/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'JCSA-AI-Executive-Summary.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1B2A4A] mb-1">AI Executive Summary</h1>
          <p className="text-sm text-gray-500">
            Generate an AI-powered analysis of survey results using Claude.
          </p>
        </div>

        <DashboardFiltersBar filters={filters} onChange={setFilters} />

        <div className="mb-6 flex gap-3">
          {!loading ? (
            <button
              onClick={generateSummary}
              className="px-5 py-2.5 bg-[#1B2A4A] text-white rounded-lg text-sm font-medium hover:bg-[#2a3d63] transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Summary
            </button>
          ) : (
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
          )}

          {content && !loading && (
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="px-5 py-2.5 bg-[#ECB421] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#d4a31e] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading && !content && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-[#ECB421] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Analysing survey data...</span>
            </div>
          </div>
        )}

        {content && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 lg:p-8">
            {loading && (
              <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
                <div className="w-3 h-3 border-2 border-[#ECB421] border-t-transparent rounded-full animate-spin" />
                Generating...
              </div>
            )}
            <MarkdownRenderer content={content} />
          </div>
        )}

        {!loading && !content && !error && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="text-gray-400 mb-3">
              <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              Click &quot;Generate Summary&quot; to create an AI-powered executive summary of the survey data.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Apply filters above to focus the analysis on specific periods or sectors.
            </p>
          </div>
        )}
      </div>
  );
}
