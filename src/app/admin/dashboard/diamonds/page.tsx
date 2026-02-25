'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardFiltersBar from '@/components/admin/DashboardFilters';
import KAnonChart from '@/components/charts/KAnonChart';
import type { DashboardFilters } from '@/types';

const DIAMONDS_KEYWORDS = [
  'diamond', 'gemstone', 'gem', 'lab-grown', 'lab_grown', 'natural',
  'clarity', 'colour', 'color', 'carat', 'cut', 'certified',
  'stone', 'precious_stone', 'semi-precious',
];

interface CachedAggregation {
  cache_key: string;
  dimensions: Record<string, string | number>;
  data: Record<string, number> | null;
  response_count: number;
  suppressed: boolean;
}

interface DashboardData {
  cached_aggregations: CachedAggregation[];
}

function matchesDiamondsKeywords(cacheKey: string): boolean {
  const lower = cacheKey.toLowerCase();
  return DIAMONDS_KEYWORDS.some((kw) => lower.includes(kw));
}

export default function DiamondsDashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.year) params.set('year', String(filters.year));
      if (filters.quarter) params.set('quarter', String(filters.quarter));
      if (filters.sector) params.set('sector', filters.sector);
      if (filters.size_band) params.set('size_band', filters.size_band);

      const res = await fetch(`/api/admin/dashboard?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredAggregations = data?.cached_aggregations.filter((agg) =>
    matchesDiamondsKeywords(agg.cache_key)
  ) ?? [];

  const displayAggregations = filteredAggregations.length > 0
    ? filteredAggregations
    : data?.cached_aggregations ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Diamonds &amp; Gems</h1>
        <p className="text-sm text-gray-500 mt-1">
          Diamond and gemstone market insights including lab-grown vs natural preferences, clarity and colour trends, and carat distributions.
        </p>
      </div>

      <DashboardFiltersBar filters={filters} onChange={setFilters} />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#ECB421] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displayAggregations.length > 0 ? (
        <div>
          {filteredAggregations.length === 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              No diamond-specific questions matched. Showing all available aggregations.
            </p>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {displayAggregations.map((agg) => (
              <KAnonChart
                key={agg.cache_key}
                title={agg.cache_key}
                data={agg.data}
                responseCount={agg.response_count}
                suppressed={agg.suppressed}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-12">
          No diamonds data available yet. Responses will appear here once surveys are submitted.
        </div>
      )}
    </div>
  );
}
