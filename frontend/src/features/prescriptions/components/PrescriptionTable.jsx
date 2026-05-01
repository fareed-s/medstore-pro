import { memo } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import Spinner from '../../../shared/components/Spinner';
import PrescriptionRow from './PrescriptionRow';
import { selectPrescriptionIds, selectPrescriptionsStatus } from '../prescriptionsSlice';

function PrescriptionTable() {
  const ids = useSelector(selectPrescriptionIds, shallowEqual);
  const status = useSelector(selectPrescriptionsStatus);

  if (status === 'loading') return <div className="card overflow-hidden p-0"><Spinner /></div>;
  if (!ids.length) return <div className="card text-center py-12 text-gray-400">No prescriptions found</div>;

  return (
    <div className="card overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-header">
            <th className="px-4 py-3">Patient</th>
            <th className="px-4 py-3">Doctor</th>
            <th className="px-4 py-3 hidden md:table-cell">Medicines</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 hidden lg:table-cell">Date</th>
            <th className="px-4 py-3 hidden lg:table-cell">Expiry</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {ids.map((id) => <PrescriptionRow key={id} prescriptionId={id} />)}
        </tbody>
      </table>
    </div>
  );
}

export default memo(PrescriptionTable);
