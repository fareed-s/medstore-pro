import { memo } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { formatCurrency } from '../../../utils/helpers';
import { selectSalesSummary } from '../salesSlice';

function SalesSummary() {
  const summary = useSelector(selectSalesSummary, shallowEqual);
  if (!summary) return null;
  const s = summary.summary || {};
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <Stat label="Today's Sales" value={s.totalSales || 0} />
      <Stat label="Revenue"       value={formatCurrency(s.totalRevenue || 0)} accent />
      <Stat label="Avg Bill"      value={formatCurrency(s.avgBillValue || 0)} />
      <Stat label="Items Sold"    value={s.totalItems || 0} />
    </div>
  );
}

const Stat = memo(function Stat({ label, value, accent }) {
  return (
    <div className="card text-center py-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-heading font-bold ${accent ? 'text-primary-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
});

export default memo(SalesSummary);
