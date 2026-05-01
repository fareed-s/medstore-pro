import { useEffect, useState } from 'react';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { HiOutlineShoppingCart, HiOutlineExclamation } from 'react-icons/hi';
import Spinner from '../../shared/components/Spinner';
import ReorderRow from './components/ReorderRow';

export default function ReorderPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/inventory-v2/reorder-suggestions').then((r) => setData(r.data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" padding="lg" />;

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Reorder Suggestions</h1>
      <p className="text-gray-500 text-sm mb-6">Products at or below reorder level</p>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryStat icon={HiOutlineShoppingCart} bg="bg-amber-50" color="text-amber-600" label="Need Reorder" value={data.summary.count} />
          <SummaryStat icon={HiOutlineExclamation}  bg="bg-red-50"   color="text-red-600"   label="Critical (0 stock)" value={data.summary.critical}     valueColor="text-red-600" />
          <SummaryStat icon={HiOutlineExclamation}  bg="bg-amber-50" color="text-amber-600" label="High Priority"      value={data.summary.high}         valueColor="text-amber-600" />
          <div className="card text-center py-3">
            <p className="text-xs text-gray-500">Est. Reorder Cost</p>
            <p className="text-xl font-heading font-bold text-primary-600">{formatCurrency(data.summary.totalEstimatedCost)}</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {data?.items?.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="font-medium">All stock levels are healthy!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Current</th>
                  <th className="px-4 py-3 text-center">Reorder Level</th>
                  <th className="px-4 py-3 text-center">Suggested Qty</th>
                  <th className="px-4 py-3 text-right">Est. Cost</th>
                  <th className="px-4 py-3">Urgency</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Rack</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.items?.map((item) => <ReorderRow key={item._id} item={item} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryStat({ icon: Icon, bg, color, label, value, valueColor }) {
  return (
    <div className="stat-card">
      <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-xl font-heading font-bold ${valueColor || ''}`}>{value}</p>
      </div>
    </div>
  );
}
