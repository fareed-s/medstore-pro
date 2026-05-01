import { memo } from 'react';
import { formatDate } from '../../../utils/helpers';
import { DL_TYPE_LABEL } from './DL_TYPES';

const STATUS_COLOR = {
  active:          'badge-green',
  expiring_soon:   'badge-amber',
  expired:         'badge-red',
  renewal_pending: 'badge-blue',
};

function DrugLicenseRow({ license: dl }) {
  return (
    <tr className={`hover:bg-gray-50/50 ${dl.renewalStatus === 'expired' ? 'bg-red-50/30' : ''}`}>
      <td className="px-4 py-2">
        <span className="badge badge-blue text-[10px]">{DL_TYPE_LABEL[dl.type] || dl.type}</span>
      </td>
      <td className="px-4 py-2 font-mono font-bold text-xs">{dl.licenseNumber}</td>
      <td className="px-4 py-2">
        {dl.issuedTo || '—'}
        {dl.supplierId && <p className="text-xs text-gray-400">{dl.supplierId.supplierName}</p>}
      </td>
      <td className="px-4 py-2 text-xs text-gray-500">{dl.issueDate ? formatDate(dl.issueDate) : '—'}</td>
      <td className="px-4 py-2 text-xs font-medium">{formatDate(dl.expiryDate)}</td>
      <td className="px-4 py-2">
        <span className={`badge ${STATUS_COLOR[dl.renewalStatus]} text-[10px]`}>
          {dl.renewalStatus?.replace('_', ' ')}
        </span>
      </td>
    </tr>
  );
}

export default memo(DrugLicenseRow);
