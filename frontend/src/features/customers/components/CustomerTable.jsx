import { memo } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import CustomerRow from './CustomerRow';
import { selectCustomerIds, selectCustomersStatus } from '../customersSlice';

function CustomerTable({ onEdit }) {
  // shallowEqual on the IDs array — re-renders only when the set of IDs changes,
  // not when an individual customer's fields are edited.
  const ids = useSelector(selectCustomerIds, shallowEqual);
  const status = useSelector(selectCustomersStatus);

  return (
    <div className="card overflow-hidden p-0">
      {status === 'loading' ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 hidden md:table-cell">Type</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 hidden lg:table-cell">Loyalty</th>
                <th className="px-4 py-3 hidden lg:table-cell">Spent</th>
                <th className="px-4 py-3 hidden md:table-cell">Allergies</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ids.length === 0
                ? <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No customers yet.</td></tr>
                : ids.map((id) => <CustomerRow key={id} customerId={id} onEdit={onEdit} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default memo(CustomerTable);
