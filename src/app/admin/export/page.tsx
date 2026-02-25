'use client';

import { useState } from 'react';
import DashboardFiltersBar from '@/components/admin/DashboardFilters';
import type { DashboardFilters } from '@/types';

export default function ExportPage() {
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [exporting, setExporting] = useState<'pdf' | 'pptx' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(format: 'pdf' | 'pptx') {
    setExporting(format);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('format', format);
      if (filters.year) params.set('year', String(filters.year));
      if (filters.quarter) params.set('quarter', String(filters.quarter));
      if (filters.sector) params.set('sector', filters.sector);
      if (filters.size_band) params.set('size_band', filters.size_band);

      const res = await fetch(`/api/admin/export?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Export failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JCSA-Survey-Report-${filters.year || 'All'}-Q${filters.quarter || 'All'}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-2">Export Reports</h1>
      <p className="text-gray-600 mb-6">Generate PDF or PowerPoint reports with the selected filters.</p>

      <DashboardFiltersBar filters={filters} onChange={setFilters} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#1B2A4A] mb-2">PDF Report</h2>
          <p className="text-sm text-gray-600 mb-4">
            Full report with title page, methodology summary, charts, and auto-generated commentary.
          </p>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="bg-[#1B2A4A] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#2a3d5e] transition-colors disabled:opacity-50"
          >
            {exporting === 'pdf' ? 'Generating...' : 'Download PDF'}
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#1B2A4A] mb-2">PowerPoint Report</h2>
          <p className="text-sm text-gray-600 mb-4">
            Slide deck with one slide per major chart/insight, suitable for presentations.
          </p>
          <button
            onClick={() => handleExport('pptx')}
            disabled={exporting !== null}
            className="bg-[#ECB421] text-[#1B2A4A] px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#d9a31e] transition-colors disabled:opacity-50"
          >
            {exporting === 'pptx' ? 'Generating...' : 'Download PPTX'}
          </button>
        </div>
      </div>
    </div>
  );
}
