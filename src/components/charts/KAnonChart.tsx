'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, PieChart, Pie, Legend,
} from 'recharts';

interface KAnonChartProps {
  title: string;
  data: Record<string, number> | null;
  responseCount: number;
  suppressed: boolean;
  type?: 'bar' | 'pie';
}

const COLORS = ['#ECB421', '#1B2A4A', '#4A90D9', '#7BC67E', '#E8845C', '#9B6FD1', '#D9534F', '#5BC0DE'];

export default function KAnonChart({
  title,
  data,
  responseCount,
  suppressed,
  type = 'bar',
}: KAnonChartProps) {
  if (suppressed || !data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-[#1B2A4A] mb-4">{title}</h3>
        <div className="h-48 flex items-center justify-center">
          <p className="text-sm text-gray-500 italic">
            Insufficient responses to preserve anonymity.
          </p>
        </div>
      </div>
    );
  }

  const chartData = Object.entries(data).map(([name, value]) => ({
    name: name.length > 20 ? name.slice(0, 18) + '...' : name,
    fullName: name,
    value,
  }));

  const total = Object.values(data).reduce((s, v) => s + v, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-[#1B2A4A]">{title}</h3>
        <span className="text-xs text-gray-400">n={responseCount}</span>
      </div>

      {type === 'bar' ? (
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => {
                const v = Number(value) || 0;
                return [`${v} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`, 'Responses'];
              }}
              labelFormatter={(label) => {
                const item = chartData.find((d) => d.name === label);
                return item?.fullName || label;
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => {
                const v = Number(value) || 0;
                return [`${v} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`, 'Responses'];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
