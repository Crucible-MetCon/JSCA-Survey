'use client';

import { SECTOR_LABELS } from '@/types';
import type { Sector, DashboardFilters } from '@/types';

interface DashboardFiltersBarProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);
const QUARTERS = [1, 2, 3, 4];
const SIZE_BANDS = ['0–2', '3–5', '6–10', '11–20', '21–30', '30+'];

export default function DashboardFiltersBar({ filters, onChange }: DashboardFiltersBarProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-6 bg-white rounded-lg border border-gray-200 p-4">
      <select
        value={filters.year || ''}
        onChange={(e) => onChange({ ...filters, year: e.target.value ? parseInt(e.target.value) : undefined })}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#ECB421] focus:outline-none"
      >
        <option value="">All Years</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <select
        value={filters.quarter || ''}
        onChange={(e) => onChange({ ...filters, quarter: e.target.value ? parseInt(e.target.value) : undefined })}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#ECB421] focus:outline-none"
      >
        <option value="">All Quarters</option>
        {QUARTERS.map((q) => (
          <option key={q} value={q}>Q{q}</option>
        ))}
      </select>

      <select
        value={filters.sector || ''}
        onChange={(e) => onChange({ ...filters, sector: (e.target.value || undefined) as Sector | undefined })}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#ECB421] focus:outline-none"
      >
        <option value="">All Sectors</option>
        {Object.entries(SECTOR_LABELS).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      <select
        value={filters.size_band || ''}
        onChange={(e) => onChange({ ...filters, size_band: e.target.value || undefined })}
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#ECB421] focus:outline-none"
      >
        <option value="">All Sizes</option>
        {SIZE_BANDS.map((band) => (
          <option key={band} value={band}>{band} employees</option>
        ))}
      </select>

      {(filters.year || filters.quarter || filters.sector || filters.size_band) && (
        <button
          onClick={() => onChange({})}
          className="px-3 py-2 text-sm text-gray-500 hover:text-[#1B2A4A] transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
