import { memo, useCallback, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

function RackMedicineRow({ medicine: m, onSaveLocation }) {
  const { hasRole } = useAuth();
  const canEdit = hasRole('SuperAdmin', 'StoreAdmin', 'InventoryStaff');
  const [draft, setDraft] = useState(m.rackLocation || '');

  // Keep local input in sync if parent data changes
  useEffect(() => { setDraft(m.rackLocation || ''); }, [m.rackLocation]);

  const onChange = useCallback((e) => setDraft(e.target.value), []);
  const onBlur = useCallback(() => {
    if (draft !== (m.rackLocation || '')) onSaveLocation?.(m._id, draft);
  }, [draft, m._id, m.rackLocation, onSaveLocation]);

  const stockClass = m.currentStock === 0
    ? 'text-red-600'
    : m.currentStock <= m.lowStockThreshold
      ? 'text-amber-600'
      : 'text-gray-900';

  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-2">
        <Link to={`/medicines/${m._id}`} className="font-medium text-xs text-gray-900 hover:text-primary-600">{m.medicineName}</Link>
        <p className="text-[10px] text-gray-400">{m.genericName}</p>
      </td>
      <td className="px-4 py-2 text-xs text-gray-500">{m.category}</td>
      <td className="px-4 py-2 text-right">
        <span className={`font-semibold ${stockClass}`}>{m.currentStock}</span>
      </td>
      <td className="px-4 py-2">
        {canEdit
          ? <input className="input-field text-xs py-1 w-32" value={draft} onChange={onChange} onBlur={onBlur} />
          : <span className="text-xs text-gray-500">{m.rackLocation}</span>}
      </td>
    </tr>
  );
}

export default memo(RackMedicineRow);
