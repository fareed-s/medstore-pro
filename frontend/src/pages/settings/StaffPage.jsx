import { useEffect, useMemo, useState } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { ROLE_LABELS } from '../../utils/helpers';
import { MODULES, ACTIONS, emptyMatrix, mergeMatrix } from '../../utils/modules';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineBan, HiOutlineCheck, HiOutlineX } from 'react-icons/hi';

const ASSIGNABLE_ROLES = ['StoreAdmin', 'Pharmacist', 'Cashier', 'InventoryStaff'];
const PERMISSION_ACTIONS = ACTIONS.filter(a => a !== 'view'); // matrix columns: Add / Edit / Delete

const blankForm = () => ({
  name: '', email: '', password: '', phone: '',
  role: 'Cashier', isActive: true,
  modulePermissions: emptyMatrix(),
});

const toErrorMsg = (err, fallback = 'Operation failed') =>
  err?.response?.data?.message || err?.message || fallback;

export default function StaffPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [roleDefaults, setRoleDefaults] = useState({});

  useEffect(() => { fetchUsers(); fetchModuleCatalog(); }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await API.get('/users');
      setUsers(data.data);
    } catch (err) {
      toast.error(toErrorMsg(err, 'Failed to load staff'));
    } finally {
      setLoading(false);
    }
  };

  const fetchModuleCatalog = async () => {
    try {
      const { data } = await API.get('/users/modules');
      setRoleDefaults(data.data?.defaults || {});
    } catch { /* non-fatal — UI falls back to empty matrix */ }
  };

  const startCreate = () => {
    const seed = roleDefaults['Cashier'] || emptyMatrix();
    setForm({ ...blankForm(), modulePermissions: mergeMatrix(emptyMatrix(), seed) });
    setEditId(null);
    setShowForm(true);
  };

  const startEdit = (u) => {
    setForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      phone: u.phone || '',
      role: u.role,
      isActive: u.isActive,
      modulePermissions: mergeMatrix(emptyMatrix(), u.modulePermissions || {}),
    });
    setEditId(u._id);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditId(null); setForm(blankForm()); };

  const handleRoleChange = (role) => {
    const seed = roleDefaults[role];
    setForm(f => ({
      ...f,
      role,
      modulePermissions: seed ? mergeMatrix(emptyMatrix(), seed) : f.modulePermissions,
    }));
  };

  const setCell = (moduleKey, action, value) => {
    setForm(f => {
      const next = { ...f.modulePermissions };
      const row = { ...(next[moduleKey] || { view: false, add: false, edit: false, delete: false }) };
      row[action] = value;
      // any actionable permission implies view
      if (value && action !== 'view') row.view = true;
      next[moduleKey] = row;
      return { ...f, modulePermissions: next };
    });
  };

  const setRow = (moduleKey, value) => {
    setForm(f => {
      const next = { ...f.modulePermissions };
      next[moduleKey] = { view: value, add: value, edit: value, delete: value };
      return { ...f, modulePermissions: next };
    });
  };

  const setAll = (value) => {
    setForm(f => {
      const next = {};
      for (const m of MODULES) next[m.key] = { view: value, add: value, edit: value, delete: value };
      return { ...f, modulePermissions: next };
    });
  };

  const setColumn = (action, value) => {
    setForm(f => {
      const next = { ...f.modulePermissions };
      for (const m of MODULES) {
        const row = { ...(next[m.key] || { view: false, add: false, edit: false, delete: false }) };
        row[action] = value;
        if (value && action !== 'view') row.view = true;
        next[m.key] = row;
      }
      return { ...f, modulePermissions: next };
    });
  };

  // Derived flags for header/row "check all" state
  const allChecked = useMemo(() => {
    return MODULES.every(m => {
      const r = form.modulePermissions[m.key] || {};
      return PERMISSION_ACTIONS.every(a => r[a]);
    });
  }, [form.modulePermissions]);

  const rowFullyChecked = (moduleKey) => {
    const r = form.modulePermissions[moduleKey] || {};
    return PERMISSION_ACTIONS.every(a => r[a]);
  };

  const columnFullyChecked = (action) =>
    MODULES.every(m => form.modulePermissions[m.key]?.[action]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        role: form.role,
        isActive: form.isActive,
        modulePermissions: form.modulePermissions,
      };
      if (editId) {
        await API.put(`/users/${editId}`, payload);
        if (form.password) {
          await API.put(`/users/${editId}/reset-password`, { password: form.password });
        }
        toast.success('Staff updated');
      } else {
        await API.post('/users', { ...payload, email: form.email, password: form.password });
        toast.success('Staff member added');
      }
      closeForm();
      fetchUsers();
    } catch (err) {
      toast.error(toErrorMsg(err));
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await API.put(`/users/${id}`, { isActive: !isActive });
      toast.success(isActive ? 'User deactivated' : 'User activated');
      fetchUsers();
    } catch (err) {
      toast.error(toErrorMsg(err));
    }
  };

  const roleBadge = {
    StoreAdmin: 'badge-green',
    Pharmacist: 'badge-blue',
    Cashier: 'badge-amber',
    InventoryStaff: 'badge-gray',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 text-sm">{users.length} team members</p>
        </div>
        {!showForm && (
          <button onClick={startCreate} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" /> Add Staff
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-gray-900">
              {editId ? 'Edit Staff Member' : 'New Staff Member'}
            </h3>
            <button type="button" onClick={closeForm} className="btn-ghost p-2" title="Close">
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name" required>
              <input className="input-field" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Name" />
            </Field>
            <Field label="Email" required>
              <input type="email" className="input-field" value={form.email} disabled={!!editId}
                onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="Email" />
            </Field>
            <Field label="Password" required={!editId}>
              <input type="password" className="input-field" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editId ? 'Leave blank to keep current password' : 'Password'}
                minLength={editId ? 0 : 6}
                required={!editId} />
            </Field>
            <Field label="User Type" required>
              <select className="input-field" value={form.role}
                onChange={(e) => handleRoleChange(e.target.value)} required>
                {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </Field>
            <Field label="Status" required>
              <select className="input-field" value={form.isActive ? 'active' : 'inactive'}
                onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
            <Field label="Phone">
              <input className="input-field" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
            </Field>
          </div>

          {/* Permission matrix */}
          <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  <th className="px-3 py-3 w-24">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={allChecked} onChange={(v) => setAll(v)} />
                      <span className="text-xs font-semibold normal-case tracking-normal">Check all</span>
                    </label>
                  </th>
                  <th className="px-3 py-3 text-left">Component</th>
                  {PERMISSION_ACTIONS.map(a => (
                    <th key={a} className="px-3 py-3 text-center w-24">
                      <label className="inline-flex flex-col items-center gap-1 cursor-pointer">
                        <span className="capitalize">{a}</span>
                        <Checkbox checked={columnFullyChecked(a)} onChange={(v) => setColumn(a, v)} />
                      </label>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MODULES.map(m => {
                  const row = form.modulePermissions[m.key] || {};
                  return (
                    <tr key={m.key} className="hover:bg-gray-50/60">
                      <td className="px-3 py-2.5 text-center">
                        <Checkbox checked={rowFullyChecked(m.key)} onChange={(v) => setRow(m.key, v)} />
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-700">{m.label}</td>
                      {PERMISSION_ACTIONS.map(a => (
                        <td key={a} className="px-3 py-2.5 text-center">
                          <Checkbox checked={!!row[a]} onChange={(v) => setCell(m.key, a, v)} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button type="button" onClick={closeForm} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editId ? 'Update' : 'Save'}</button>
          </div>
        </form>
      ) : (
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(u => (
                  <tr key={u._id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${roleBadge[u.role] || 'badge-gray'}`}>{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => startEdit(u)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Edit">
                          <HiOutlinePencil className="w-4 h-4 text-gray-500" />
                        </button>
                        {u.role !== 'StoreAdmin' && (
                          <button type="button" onClick={() => toggleActive(u._id, u.isActive)} className="p-1.5 rounded-lg hover:bg-gray-100" title={u.isActive ? 'Deactivate' : 'Activate'}>
                            {u.isActive
                              ? <HiOutlineBan className="w-4 h-4 text-red-500" />
                              : <HiOutlineCheck className="w-4 h-4 text-green-500" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!users.length && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No staff yet — click "Add Staff" to create one.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="label">
        {required && <span className="text-red-500 mr-0.5">*</span>}{label}
      </label>
      {children}
    </div>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer accent-primary-600"
    />
  );
}
