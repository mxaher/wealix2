// BUG #025 FIX — Client-only chart with guaranteed min-height
'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { name: string; value: number; color: string }[];
}

export default function PortfolioAllocationChartClient({ data }: Props) {
  return (
    <div style={{ minHeight: '288px', width: '100%' }}>
      <ResponsiveContainer width='100%' height={288}>
        <PieChart>
          <Pie data={data} dataKey='value' nameKey='name' cx='50%' cy='50%' outerRadius={100}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Allocation']} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
