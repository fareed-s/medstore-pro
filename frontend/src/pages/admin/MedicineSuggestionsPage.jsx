// Crowdsourced medicine catalog — pending-review queue.
// Stores add medicines manually; if the name isn't in MasterMedicine,
// the backend queues it here. SuperAdmin approves (→ MasterMedicine)
// or rejects (kept for audit, hidden from queue).

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  HiOutlineCheck, HiOutlineX, HiOutlineRefresh, HiOutlineSearch,
  HiOutlinePencil, HiOutlineUserGroup, HiOutlineClock,
} from 'react-icons/hi';
import API from '../../utils/api';
import { apiError, formatCurrency } from '../../utils/helpers';
import { confirmDanger } from '../../utils/swal';

const TABS = [
  { key: 'pending',  label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const SCHEDULE_BADGE = {
  'OTC':          'bg-gray-100 text-gray-700',
  'Schedule-G':   'bg-blue-50 text-blue-700',
  'Schedule-H':   'bg-amber-50 text-amber-700',
  'Schedule-H1':  'bg-orange-50 text-orange-700',
  'Schedule-X':   'bg-red-50 text-red-700',
};

export default function MedicineSuggestionsPage() {
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const fetchList = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/superadmin/medicine-suggestions', {
        params: { status: tab, search: search.trim() || undefined, limit: 100 },
      });
      setItems(data.data || []);
      setPendingCount(data.pendingCount || 0);
    } catch (err) {
      toast.error(apiError(err, 'Failed to load suggestions'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [tab]);

  const approveQuick = async (s) => {
    if (!window.confirm(`Approve "${s.medicineName}" and add to master catalog?`)) return;
    try {
      await API.put(`/superadmin/medicine-suggestions/${s._id}/approve`);
      toast.success(`✅ "${s.medicineName}" added to master catalog`);
      fetchList();
    } catch (err) {
      toast.error(apiError(err, 'Approve failed'));
    }
  };

  const approveWithEdits = async (overrides) => {
    if (!editing) return;
    try {
      await API.put(`/superadmin/medicine-suggestions/${editing._id}/approve`, overrides);
      toast.success(`✅ "${overrides.medicineName || editing.medicineName}" added to master catalog`);
      setEditing(null);
      fetchList();
    } catch (err) {
      toast.error(apiError(err, 'Approve failed'));
    }
  };

  const reject = async (s) => {
    const ok = await confirmDanger(
      `Reject "${s.medicineName}"? It will be hidden from the queue (kept for audit).`,
      { title: 'Reject suggestion?', confirmText: 'Reject' }
    );
    if (!ok) return;
    const reason = window.prompt('Reason (optional):') || '';
    try {
      await API.put(`/superadmin/medicine-suggestions/${s._id}/reject`, { reason });
      toast.success('Rejected');
      fetchList();
    } catch (err) {
      toast.error(apiError(err, 'Reject failed'));
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Medicine Suggestions</h1>
          <p className="text-gray-500 text-sm">
            Crowdsourced catalog — stores add new medicines, you approve them into the master catalog.
          </p>
        </div>
        <button onClick={fetchList} className="btn-secondary text-sm flex items-center gap-1.5">
          <HiOutlineRefresh className="w-4 h-4"/> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.key === 'pending' && pendingCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-md">
        <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
        <input
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm"
          placeholder="Search by medicine name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchList()}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"/>
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          {tab === 'pending' ? '🎉 Nothing to review — the queue is clear.' : `No ${tab} suggestions.`}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Medicine</th>
                  <th className="px-4 py-3 text-left">Schedule</th>
                  <th className="px-4 py-3 text-right">MRP / Sale</th>
                  <th className="px-4 py-3 text-left">Contributors</th>
                  <th className="px-4 py-3 text-left">First added</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.medicineName}</p>
                      <p className="text-xs text-gray-400">
                        {s.genericName || '—'} {s.strength ? ` · ${s.strength}` : ''} {s.packSize ? ` · ${s.packSize}` : ''}
                      </p>
                      {s.manufacturer && <p className="text-[11px] text-gray-400">{s.manufacturer}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${SCHEDULE_BADGE[s.schedule] || 'bg-gray-100 text-gray-700'}`}>
                        {s.schedule}
                      </span>
                      <p className="text-[11px] text-gray-400 mt-0.5">{s.category}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      <p>{formatCurrency(s.mrp || 0)}</p>
                      <p className="text-gray-400">{formatCurrency(s.salePrice || 0)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs">
                        <HiOutlineUserGroup className="w-3.5 h-3.5 text-gray-400"/>
                        <span className="font-medium text-gray-700">{s.contributorCount}</span>
                        <span className="text-gray-400">{s.contributorCount === 1 ? 'store' : 'stores'}</span>
                      </div>
                      {s.contributedByStoreIds?.length > 0 && (
                        <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[180px]">
                          {s.contributedByStoreIds.map((st) => st.storeName).join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <HiOutlineClock className="w-3.5 h-3.5"/>
                        {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                      {s.firstContributedBy?.name && (
                        <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{s.firstContributedBy.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {tab === 'pending' ? (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => approveQuick(s)}
                            className="p-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                            title="Approve and add to master catalog"
                          >
                            <HiOutlineCheck className="w-4 h-4"/>
                          </button>
                          <button
                            onClick={() => setEditing(s)}
                            className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700"
                            title="Edit and approve"
                          >
                            <HiOutlinePencil className="w-4 h-4"/>
                          </button>
                          <button
                            onClick={() => reject(s)}
                            className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700"
                            title="Reject"
                          >
                            <HiOutlineX className="w-4 h-4"/>
                          </button>
                        </div>
                      ) : (
                        <div className="text-right">
                          <p className="text-[11px] text-gray-400">
                            {s.reviewedAt ? new Date(s.reviewedAt).toLocaleDateString() : '—'}
                          </p>
                          {s.rejectionReason && (
                            <p className="text-[11px] text-red-500 italic truncate max-w-[160px]">{s.rejectionReason}</p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <EditApproveModal
          suggestion={editing}
          onClose={() => setEditing(null)}
          onApprove={approveWithEdits}
        />
      )}
    </div>
  );
}

// ─── Edit-before-approve modal ──────────────────────────────────────────────
function EditApproveModal({ suggestion, onClose, onApprove }) {
  const [form, setForm] = useState({
    medicineName: suggestion.medicineName || '',
    genericName: suggestion.genericName || '',
    manufacturer: suggestion.manufacturer || '',
    category: suggestion.category || 'Tablet',
    schedule: suggestion.schedule || 'OTC',
    strength: suggestion.strength || '',
    packSize: suggestion.packSize || '1',
    mrp: suggestion.mrp || 0,
    salePrice: suggestion.salePrice || 0,
    taxRate: suggestion.taxRate || 0,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b flex justify-between items-center">
          <h3 className="font-heading font-bold">Edit & Approve</h3>
          <button onClick={onClose}><HiOutlineX className="w-5 h-5"/></button>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <Field label="Medicine name *" value={form.medicineName} onChange={(v) => set('medicineName', v)}/>
          <Field label="Generic name" value={form.genericName} onChange={(v) => set('genericName', v)}/>
          <Field label="Manufacturer" value={form.manufacturer} onChange={(v) => set('manufacturer', v)}/>
          <Field label="Strength" value={form.strength} onChange={(v) => set('strength', v)}/>
          <Field label="Pack size" value={form.packSize} onChange={(v) => set('packSize', v)}/>
          <div>
            <label className="text-xs font-medium text-gray-600">Category</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)} className="w-full mt-1 px-2 py-2 rounded-lg border border-gray-200 text-sm">
              {['Tablet','Capsule','Syrup','Injection','Cream/Ointment','Drops','Inhaler','Suppository','Sachet','Powder','Surgical','Device','Cosmetic','OTC','Baby Care','Nutrition','Gel','Lotion','Solution','Suspension','Spray','Patch','Strip'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Schedule</label>
            <select value={form.schedule} onChange={(e) => set('schedule', e.target.value)} className="w-full mt-1 px-2 py-2 rounded-lg border border-gray-200 text-sm">
              {['OTC','Schedule-G','Schedule-H','Schedule-H1','Schedule-X'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <Field label="MRP" type="number" value={form.mrp} onChange={(v) => set('mrp', parseFloat(v) || 0)}/>
          <Field label="Sale price" type="number" value={form.salePrice} onChange={(v) => set('salePrice', parseFloat(v) || 0)}/>
          <Field label="Tax rate %" type="number" value={form.taxRate} onChange={(v) => set('taxRate', parseFloat(v) || 0)}/>
        </div>
        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => onApprove(form)}
            disabled={!form.medicineName.trim()}
            className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-40"
          >
            <HiOutlineCheck className="w-4 h-4"/> Approve to Master
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-2 py-2 rounded-lg border border-gray-200 text-sm"
      />
    </div>
  );
}
