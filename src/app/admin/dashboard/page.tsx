'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardFiltersBar from '@/components/admin/DashboardFilters';
import KAnonChart from '@/components/charts/KAnonChart';
import { SECTOR_LABELS } from '@/types';
import type { DashboardFilters, Sector } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from 'recharts';

interface DashboardData {
  total_responses: number;
  sector_counts: { sector: string; count: number }[];
  quarterly_trend: { year: number; quarter: number; count: number }[];
  size_band_distribution: { size_band: string; count: number }[];
  cached_aggregations: {
    cache_key: string;
    dimensions: Record<string, string | number>;
    data: Record<string, number> | null;
    response_count: number;
    suppressed: boolean;
  }[];
}

export default function ExecutiveSummaryPage() {
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">Executive Summary</h1>

      <DashboardFiltersBar filters={filters} onChange={setFilters} />

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-[#ECB421] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Responses" value={data.total_responses} />
            {data.sector_counts.map((sc) => (
              <StatCard
                key={sc.sector}
                label={SECTOR_LABELS[sc.sector as Sector] || sc.sector}
                value={sc.count}
              />
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quarterly Trend */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-[#1B2A4A] mb-4">Response Trend</h3>
              {data.quarterly_trend.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.quarterly_trend.map((d) => ({ ...d, label: `${d.year} Q${d.quarter}` }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#ECB421" strokeWidth={2} dot={{ fill: '#1B2A4A' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-gray-500">
                  No trend data available yet.
                </div>
              )}
            </div>

            {/* Sector Distribution */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-[#1B2A4A] mb-4">Responses by Sector</h3>
              {data.sector_counts.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.sector_counts.map((d) => ({ ...d, name: SECTOR_LABELS[d.sector as Sector] || d.sector }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ECB421" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-gray-500">
                  No sector data available yet.
                </div>
              )}
            </div>

            {/* Size Band Distribution */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-[#1B2A4A] mb-4">Responses by Business Size</h3>
              {data.size_band_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.size_band_distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="size_band" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1B2A4A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-gray-500">
                  No size band data available yet.
                </div>
              )}
            </div>
          </div>

          {/* Aggregated question data from cache */}
          {data.cached_aggregations.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-[#1B2A4A] mb-4">Question-Level Insights</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {data.cached_aggregations.slice(0, 10).map((agg) => (
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
          )}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-12">
          No data available. Responses will appear here once surveys are submitted.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-[#1B2A4A] mt-1">{value}</p>
    </div>
  );
}
