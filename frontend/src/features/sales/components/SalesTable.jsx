import { memo } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import Spinner from '../../../shared/components/Spinner';
import SaleRow from './SaleRow';
import { selectSaleIds, selectSalesStatus } from '../salesSlice';

function SalesTable({ onVoid }) {
  const ids = useSelector(selectSaleIds, shallowEqual);
  const status = useSelector(selectSalesStatus);

  return (
    <div className="card overflow-hidden p-0">
      {status === 'loading' ? <Spinner /> : !ids.length ? (
        <div className="text-center py-12 text-gray-400">No sales found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 hidden md:table-cell">Items</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3 hidden md:table-cell">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden lg:table-cell">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ids.map((id) => <SaleRow key={id} saleId={id} onVoid={onVoid} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default memo(SalesTable);
