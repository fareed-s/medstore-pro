import { memo } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import Spinner from '../../../shared/components/Spinner';
import SupplierRow from './SupplierRow';
import { selectSupplierIds, selectSuppliersStatus } from '../suppliersSlice';

function SupplierTable({ onEdit }) {
  const ids = useSelector(selectSupplierIds, shallowEqual);
  const status = useSelector(selectSuppliersStatus);

  return (
    <div className="card overflow-hidden p-0">
      {status === 'loading' ? <Spinner /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3 hidden md:table-cell">Phone</th>
                <th className="px-4 py-3 hidden lg:table-cell">Terms</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 hidden lg:table-cell">DL #</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ids.length === 0
                ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No suppliers yet.</td></tr>
                : ids.map((id) => <SupplierRow key={id} supplierId={id} onEdit={onEdit} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default memo(SupplierTable);
