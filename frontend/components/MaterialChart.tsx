'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface MaterialChartProps {
  data: Array<{ name: string; percentage: number }>;
}

export default function MaterialChart({ data }: MaterialChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-gray-500">No material data available</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={data}
          dataKey="percentage"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={120}
          label={({ name, percent }) => {
            // Handle case where percent might be undefined
            if (percent === undefined) return name;
            return `${name}: ${(percent * 100).toFixed(1)}%`;
          }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => {
          if (typeof value === 'number') return `${value}%`;
          return value;
        }} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}