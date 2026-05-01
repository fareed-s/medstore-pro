import { memo } from 'react';
import { formatCurrency } from '../../../utils/helpers';

const CategoryStockRow = memo(function CategoryStockRow({ row }) {
  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-2 font-medium">{row._id || 'Other'}</td>
      <td className="px-4 py-2">{row.count}</td>
      <td className="px-4 py-2 font-semibold">{row.totalStock.toLocaleString()}</td>
      <td className="px-4 py-2 text-primary-600 font-medium">{formatCurrency(row.totalValue)}</td>
      <td className="px-4 py-2">
        {row.outOfStock > 0
          ? <span className="badge badge-red">{row.outOfStock}</span>
          : <span className="text-gray-400">0</span>}
      </td>
    </tr>
  );
});

function CategoryStockTable({ catStock }) {
  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-header">
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2">Products</th>
            <th className="px-4 py-2">Total Stock</th>
            <th className="px-4 py-2">Value</th>
            <th className="px-4 py-2">Out of Stock</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {catStock.map((c) => <CategoryStockRow key={c._id || 'other'} row={c} />)}
        </tbody>
      </table>
    </div>
  );
}

export default memo(CategoryStockTable);
