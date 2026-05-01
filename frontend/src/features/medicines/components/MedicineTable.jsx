import { memo } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import Spinner from '../../../shared/components/Spinner';
import { selectMedicineIds, selectMedicinesStatus } from '../medicinesSlice';
import MedicineRow from './MedicineRow';

function MedicineTable() {
  const ids = useSelector(selectMedicineIds, shallowEqual);
  const status = useSelector(selectMedicinesStatus);

  if (status === 'loading') return <div className="card overflow-hidden p-0"><Spinner size="md" padding="lg" /></div>;
  if (!ids.length) return (
    <div className="card text-center py-16 text-gray-400">
      <p className="font-medium">No medicines found</p>
      <p className="text-sm mt-1">Try adjusting your search or filters</p>
    </div>
  );

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3">Medicine</th>
              <th className="px-4 py-3 hidden md:table-cell">Category</th>
              <th className="px-4 py-3 hidden lg:table-cell">Schedule</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3 hidden lg:table-cell">Rack</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ids.map((id) => <MedicineRow key={id} medicineId={id} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(MedicineTable);
