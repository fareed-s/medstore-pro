// SuperAdmin-only management UI for the Controlled/Narcotic Drugs module
// of a single store. Lets the SuperAdmin:
//   - enable / disable the module
//   - set or reset the unlock password
//   - toggle inspection mode (one-way for users, but SuperAdmin can flip back)
//   - manage which users in the store can unlock the module
//   - read the immutable access log
//
// All changes go through /api/superadmin/stores/:id/controlled-module routes.

import { useEffect, useMemo, useState } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { apiError, formatDateTime, ROLE_LABELS } from '../../utils/helpers';
import { confirmDanger } from '../../utils/swal';
import {
  HiOutlineX, HiOutlineShieldCheck, HiOutlineLockClosed, HiOutlineEye,
  HiOutlineKey, HiOutlineSparkles, HiOutlineExclamation, HiOutlineDocumentSearch,
  HiOutlineCheck,
} from 'react-icons/hi';

const TABS = ['Settings', 'Users', 'Logs'];

const generatePassword = (len = 12) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const arr = new Uint32Array(len);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) window.crypto.getRandomValues(arr);
  let out = '';
  for (let i = 0; i < len; i++) out += chars[(arr[i] || Math.floor(Math.random() * 0xffffffff)) % chars.length];
  return out;
};

export default function ControlledModuleModal({ store, onClose }) {
  const [tab, setTab] = useState('Settings');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/superadmin/stores/${store._id}/controlled-module`);
      setData(res.data.data);
    } catch (err) {
      toast.error(apiError(err, 'Failed to load module settings'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [store._id]);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl my-4 sm:my-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600/20 border border-red-500/40 rounded-full flex items-center justify-center">
            <HiOutlineShieldCheck className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-bold text-white">Controlled Drugs Module</h3>
            <p className="text-xs text-gray-300 truncate">{store.storeName}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b border-gray-100 px-2 flex">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : !data ? (
            <p className="text-center py-8 text-gray-400">Failed to load.</p>
          ) : tab === 'Settings' ? (
            <SettingsTab store={store} data={data} onChange={fetchData} />
          ) : tab === 'Users' ? (
            <UsersTab store={store} data={data} onChange={fetchData} />
          ) : (
            <LogsTab store={store} />
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
function SettingsTab({ store, data, onChange }) {
  const [enabled, setEnabled] = useState(data.enabled);
  const [inspection, setInspection] = useState(data.inspectionMode);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { enabled, inspectionMode: inspection };
      if (password) payload.password = password;
      await API.put(`/superadmin/stores/${store._id}/controlled-module`, payload);
      toast.success('Module settings updated');
      setPassword('');
      onChange();
    } catch (err) {
      toast.error(apiError(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <ToggleRow
        label="Module Enabled"
        hint="Off hone par store ka koi user lock icon nahi dekhega."
        checked={enabled}
        onChange={setEnabled}
        icon={HiOutlineLockClosed}
      />

      <ToggleRow
        label="Inspection Mode"
        hint="On hone par module turant chhup jata hai. Regulatory inspection ke time use karein. SuperAdmin hi off kar sakta hai."
        checked={inspection}
        onChange={setInspection}
        icon={HiOutlineExclamation}
        danger
      />
      {data.inspectionMode && data.inspectionModeAt && (
        <p className="text-[11px] text-amber-700 -mt-2">
          Activated {formatDateTime(data.inspectionModeAt)}
        </p>
      )}

      <div>
        <label className="label flex items-center gap-1.5">
          <HiOutlineKey className="w-4 h-4 text-amber-500" />
          Module Password
          {data.hasPassword && (
            <span className="ml-2 text-[11px] text-emerald-600">
              · Set {data.passwordSetAt && formatDateTime(data.passwordSetAt)}
            </span>
          )}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input-field flex-1"
            placeholder={data.hasPassword ? 'Leave blank to keep current password' : 'Set initial password (min 6 chars)'}
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setPassword(generatePassword(12))}
            className="px-3 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 text-sm font-medium whitespace-nowrap flex items-center gap-1.5"
          >
            <HiOutlineSparkles className="w-4 h-4" /> Generate
          </button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">
          Yeh password login ke baad module unlock karne ke liye chahiye hota hai. Login password se alag rakhein.
        </p>
      </div>

      {data.lockedUntil && new Date(data.lockedUntil) > new Date() && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          User locked out until {formatDateTime(data.lockedUntil)} ({data.failedAttempts} failed attempts).
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-1.5">
          <HiOutlineCheck className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </form>
  );
}

function ToggleRow({ label, hint, checked, onChange, icon: Icon, danger }) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-600'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <input
        type="checkbox"
        className="mt-1.5 w-4 h-4 rounded"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

// ───────────────────────────────────────────────────────────────────────────
function UsersTab({ store, data, onChange }) {
  // StoreAdmin always has access — they don't appear in the togglable list.
  const togglable = useMemo(
    () => data.users.filter((u) => u.role !== 'StoreAdmin'),
    [data.users]
  );
  const [selected, setSelected] = useState(new Set(data.allowedUserIds));
  const [saving, setSaving] = useState(false);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    setSaving(true);
    try {
      const { data: res } = await API.put(
        `/superadmin/stores/${store._id}/controlled-module/users`,
        { userIds: [...selected] }
      );
      toast.success(`Updated · +${res.data.added} added · −${res.data.removed} removed`);
      onChange();
    } catch (err) {
      toast.error(apiError(err, 'Failed to update users'));
    } finally {
      setSaving(false);
    }
  };

  const storeAdmins = data.users.filter((u) => u.role === 'StoreAdmin');

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
        <p className="font-medium mb-1">StoreAdmin always has access</p>
        {storeAdmins.length > 0 && (
          <p>{storeAdmins.map((u) => u.name).join(', ')}</p>
        )}
      </div>

      {togglable.length === 0 ? (
        <p className="text-center py-6 text-gray-400 text-sm">No other staff to grant access to.</p>
      ) : (
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
          {togglable.map((u) => (
            <label key={u._id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={selected.has(String(u._id))}
                onChange={() => toggle(String(u._id))}
              />
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center">
                {(u.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-gray-500">{ROLE_LABELS[u.role] || u.role}</span>
            </label>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button onClick={submit} disabled={saving} className="btn-primary flex items-center gap-1.5">
          <HiOutlineCheck className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Allow-list'}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
const EVENT_BADGES = {
  unlock_success:  { label: 'Unlock OK',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  unlock_failed:   { label: 'Unlock Fail',   cls: 'bg-red-50 text-red-700 border-red-200' },
  unlock_blocked:  { label: 'Blocked',       cls: 'bg-red-50 text-red-700 border-red-200' },
  lock:            { label: 'Lock',          cls: 'bg-gray-50 text-gray-600 border-gray-200' },
  access:          { label: 'Access',        cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  access_denied:   { label: 'Access Denied', cls: 'bg-red-50 text-red-700 border-red-200' },
  password_set:    { label: 'Password Set',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  enabled:         { label: 'Enabled',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  disabled:        { label: 'Disabled',      cls: 'bg-gray-50 text-gray-700 border-gray-200' },
  inspection_on:   { label: 'Inspection ON', cls: 'bg-red-50 text-red-700 border-red-200' },
  inspection_off:  { label: 'Inspection OFF',cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  user_allowed:    { label: 'User +',        cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  user_revoked:    { label: 'User −',        cls: 'bg-red-50 text-red-700 border-red-200' },
};

function LogsTab({ store }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    API.get(`/superadmin/stores/${store._id}/controlled-module/logs?limit=200${filter ? `&event=${filter}` : ''}`)
      .then((r) => { if (!cancelled) setLogs(r.data.data); })
      .catch((err) => toast.error(apiError(err, 'Failed to load logs')))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [store._id, filter]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <HiOutlineDocumentSearch className="w-4 h-4 text-gray-400" />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-field py-1.5 text-sm flex-1 sm:max-w-xs"
        >
          <option value="">All events</option>
          {Object.keys(EVENT_BADGES).map((k) => (
            <option key={k} value={k}>{EVENT_BADGES[k].label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-center py-6 text-gray-400 text-sm">No log entries yet.</p>
      ) : (
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 text-sm">
          {logs.map((l) => {
            const badge = EVENT_BADGES[l.event] || { label: l.event, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
            return (
              <div key={l._id} className="p-3 flex items-start gap-3">
                <span className={`badge border ${badge.cls} flex-shrink-0`}>{badge.label}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 truncate">{l.userName || l.userEmail || '—'}</p>
                  {l.reason && <p className="text-xs text-gray-500">{l.reason}</p>}
                  {l.route && <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">{l.route}</p>}
                </div>
                <div className="text-right flex-shrink-0 text-[11px] text-gray-400">
                  {formatDateTime(l.createdAt)}
                  {l.ipAddress && <p>{l.ipAddress}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
