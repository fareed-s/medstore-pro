import { memo } from 'react';
import { HiOutlinePlus } from 'react-icons/hi';

function CustomerHeader({ count, onAdd }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-gray-900">Customers</h1>
        <p className="text-gray-500 text-sm">{count} customers</p>
      </div>
      <button onClick={onAdd} className="btn-primary flex items-center gap-2">
        <HiOutlinePlus className="w-4 h-4" /> Add Customer
      </button>
    </div>
  );
}

export default memo(CustomerHeader);
