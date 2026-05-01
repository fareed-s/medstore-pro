import { memo, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function FastMoverChart({ items }) {
  const data = useMemo(
    () => items.slice(0, 10).map((m) => ({ name: m.medicineName?.substring(0, 15), qty: m.totalQty })),
    [items]
  );
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="qty" fill="#059669" radius={[4, 4, 0, 0]} name="Units Sold" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default memo(FastMoverChart);
