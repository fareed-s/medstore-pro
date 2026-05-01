import { memo, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '../../../utils/helpers';

function CategoryStockChart({ catStock }) {
  const chartData = useMemo(
    () => catStock.map((c) => ({
      name: c._id || 'Other',
      stock: c.totalStock,
      value: Math.round(c.totalValue),
      outOfStock: c.outOfStock,
    })),
    [catStock]
  );

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(val, name) => [
          name === 'value' ? formatCurrency(val) : val,
          name === 'value' ? 'Value' : name === 'outOfStock' ? 'Out of Stock' : 'Total Stock',
        ]} />
        <Bar dataKey="stock"      fill="#059669" radius={[4, 4, 0, 0]} name="Stock" />
        <Bar dataKey="outOfStock" fill="#dc2626" radius={[4, 4, 0, 0]} name="Out of Stock" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default memo(CategoryStockChart);
