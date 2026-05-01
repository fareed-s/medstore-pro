import { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { formatDate } from '../../../utils/helpers';
import { makeSelectPrescriptionById } from '../prescriptionsSlice';

const STATUS_BADGE = {
  active: 'badge-blue', dispensed: 'badge-green', partial: 'badge-amber',
  expired: 'badge-red',  cancelled: 'badge-gray',
};

function PrescriptionRow({ prescriptionId }) {
  const rx = useSelector(makeSelectPrescriptionById(prescriptionId));
  const medsLabel = useMemo(
    () => (rx?.medicines || []).map((m) => m.medicineName).join(', '),
    [rx?.medicines]
  );
  if (!rx) return null;

  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-3">
        <p className="font-medium">{rx.customerName || rx.customerId?.customerName}</p>
        <p className="text-xs text-gray-400">{rx.customerId?.phone}</p>
      </td>
      <td className="px-4 py-3 text-gray-600">
        Dr. {rx.doctorName}
        <p className="text-xs text-gray-400">{rx.doctorSpecialty}</p>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <p className="text-xs text-gray-500">{medsLabel}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`badge ${STATUS_BADGE[rx.status] || 'badge-gray'}`}>{rx.status}</span>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{formatDate(rx.prescriptionDate)}</td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">{formatDate(rx.expiryDate)}</td>
    </tr>
  );
}

export default memo(PrescriptionRow);
