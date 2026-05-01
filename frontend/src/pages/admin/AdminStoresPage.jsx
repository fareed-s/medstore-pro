import { useEffect, useMemo, useState } from 'react';
import API from '../../utils/api';
import { formatDate, apiError } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { confirm, confirmDanger } from '../../utils/swal';
import {
  HiOutlineOfficeBuilding, HiOutlineCheck, HiOutlineBan, HiOutlineSearch,
  HiOutlineEye, HiOutlinePlus, HiOutlineX, HiOutlineClipboardCopy,
  HiOutlineRefresh, HiOutlinePencilAlt, HiOutlineSparkles, HiOutlineUpload,
  HiOutlineKey,
} from 'react-icons/hi';

const PLANS = ['Trial', 'Monthly', '6-Month', 'Yearly'];
const PLAN_DAYS = { 'Monthly': 30, '6-Month': 180, 'Yearly': 365 };

// Local mirror of backend computeEndDate so we can preview the expiry
// date live as the SuperAdmin types in the form.
function computeEndDate(plan, trialDays) {
  const start = new Date();
  if (plan === 'Trial') {
    const d = parseInt(trialDays);
    if (!d || d < 1) return null;
    return new Date(start.getTime() + d * 86400000);
  }
  const days = PLAN_DAYS[plan];
  if (!days) return null;
  return new Date(start.getTime() + days * 86400000);
}

// Random 10-char password (letters + digits, mixed case). Skips visually
// confusing chars like O/0 and l/1 so admins don't fat-finger them on WhatsApp.
function generatePassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  // crypto when available for a better RNG
  const arr = new Uint32Array(len);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(arr);
  }
  for (let i = 0; i < len; i++) {
    const idx = (arr[i] || Math.floor(Math.random() * 0xffffffff)) % chars.length;
    out += chars[idx];
  }
  return out;
}

const blankCreate = () => ({
  storeName: '', phone: '',
  ownerName: '',
  plan: 'Monthly',
  planPrice: '',
  trialDays: 7,
  hasMasterCatalog: false,
  adminName: '', adminEmail: '', adminPassword: '',
});

export default function AdminStoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [masterTotal, setMasterTotal] = useState(null); // null = unknown yet

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(blankCreate());
  const [createdInfo, setCreatedInfo] = useState(null);

  const [editPlanFor, setEditPlanFor] = useState(null); // store object being edited
  const [editPlanForm, setEditPlanForm] = useState({ plan: 'Monthly', planPrice: '', trialDays: 7 });
  const [savingPlan, setSavingPlan] = useState(false);

  const [resetFor, setResetFor] = useState(null);       // store object whose admin password we're resetting
  const [resetPwd, setResetPwd] = useState('');
  const [resettingPwd, setResettingPwd] = useState(false);

  useEffect(() => { fetchStores(); fetchMasterStats(); }, []);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/superadmin/stores?limit=200');
      setStores(data.data);
    } catch (err) {
      toast.error(apiError(err, 'Failed to load stores'));
    } finally {
      setLoading(false);
    }
  };
  const fetchMasterStats = async () => {
    try {
      const { data } = await API.get('/superadmin/medicines/master/stats');
      setMasterTotal(data.data.total);
    } catch { /* non-fatal */ }
  };

  const approve = async (id) => {
    try { await API.put(`/superadmin/stores/${id}/approve`); toast.success('Store approved'); fetchStores(); }
    catch (err) { toast.error(apiError(err)); }
  };
  const suspend = async (id) => {
    if (!(await confirmDanger('The admin will lose access immediately.', { title: 'Suspend this store?', confirmText: 'Suspend' }))) return;
    try { await API.put(`/superadmin/stores/${id}/suspend`); toast.success('Store suspended'); fetchStores(); }
    catch (err) { toast.error(apiError(err)); }
  };
  const reactivate = async (id) => {
    try { await API.put(`/superadmin/stores/${id}/reactivate`); toast.success('Store reactivated'); fetchStores(); }
    catch (err) { toast.error(apiError(err)); }
  };
  const openReset = (store) => { setResetFor(store); setResetPwd(generatePassword(10)); };
  const submitReset = async (e) => {
    e.preventDefault();
    if (!resetPwd || resetPwd.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setResettingPwd(true);
    try {
      const { data } = await API.put(`/superadmin/stores/${resetFor._id}/admin-password`, { newPassword: resetPwd });
      // Show the same WhatsApp-ready credentials modal we use after store create.
      setCreatedInfo({
        storeName: data.data.storeName,
        adminEmail: data.data.adminEmail,
        adminPassword: resetPwd,
        plan: resetFor.plan,
        planPrice: resetFor.planPrice,
        planEndDate: resetFor.planEndDate,
      });
      setResetFor(null);
      setResetPwd('');
      toast.success('Password reset — share new credentials with the admin');
    } catch (err) {
      toast.error(apiError(err, 'Failed to reset password'));
    } finally {
      setResettingPwd(false);
    }
  };

  const setCatalog = async (store, enabled) => {
    if (enabled && !(await confirm(
      'All catalog medicines will be copied with stock 0.',
      { title: `Grant catalog access to ${store.storeName}?`, confirmText: 'Grant' }
    ))) return;
    if (!enabled && !(await confirmDanger(
      `Existing medicines stay, but future catalog updates won't sync to ${store.storeName}.`,
      { title: 'Revoke catalog access?', confirmText: 'Revoke' }
    ))) return;
    try {
      const { data } = await API.put(`/superadmin/stores/${store._id}/catalog`, { enabled });
      if (enabled) {
        const ins = data.syncResult?.inserted || 0;
        const masterCount = data.masterTotal ?? 0;
        if (masterCount === 0) {
          toast.warning('Granted, but master catalog is empty — upload a medicine file first (Master Catalog page).');
        } else if (ins === 0) {
          toast.info(`Granted — 0 new synced (store already has all ${masterCount} master medicines).`);
        } else {
          toast.success(`Catalog access granted — ${ins} of ${masterCount} master medicine(s) synced`);
        }
      } else {
        toast.success('Catalog access revoked');
      }
      fetchStores();
      fetchMasterStats();
    } catch (err) {
      toast.error(apiError(err, 'Failed to update catalog access'));
    }
  };

  const filtered = search
    ? stores.filter(s =>
        s.storeName?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()))
    : stores;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (createForm.plan === 'Trial' && (!createForm.trialDays || createForm.trialDays < 1)) {
      toast.error('Enter trial days (e.g. 7, 15)');
      return;
    }
    setCreating(true);
    try {
      const payload = {
        ...createForm,
        planPrice: parseFloat(createForm.planPrice) || 0,
        trialDays: createForm.plan === 'Trial' ? parseInt(createForm.trialDays) : undefined,
      };
      const { data } = await API.post('/superadmin/stores', payload);
      setCreatedInfo({
        storeName: data.data.store.storeName,
        adminEmail: data.data.admin.email,
        adminPassword: createForm.adminPassword,
        plan: data.data.store.plan,
        planPrice: data.data.store.planPrice,
        planEndDate: data.data.store.planEndDate,
      });
      setCreateForm(blankCreate());
      setShowCreate(false);
      toast.success('Store created');
      fetchStores();
    } catch (err) {
      toast.error(apiError(err, 'Failed to create store'));
    } finally {
      setCreating(false);
    }
  };

  const openEditPlan = (store) => {
    setEditPlanFor(store);
    setEditPlanForm({
      plan: PLANS.includes(store.plan) ? store.plan : 'Monthly',
      planPrice: store.planPrice || '',
      trialDays: store.trialDays || 7,
    });
  };

  const submitPlanUpdate = async (e) => {
    e.preventDefault();
    if (editPlanForm.plan === 'Trial' && (!editPlanForm.trialDays || editPlanForm.trialDays < 1)) {
      toast.error('Enter trial days (e.g. 7, 15)');
      return;
    }
    setSavingPlan(true);
    try {
      await API.put(`/superadmin/stores/${editPlanFor._id}/plan`, {
        plan: editPlanForm.plan,
        planPrice: parseFloat(editPlanForm.planPrice) || 0,
        trialDays: editPlanForm.plan === 'Trial' ? parseInt(editPlanForm.trialDays) : undefined,
      });
      toast.success('Plan updated — store reactivated');
      setEditPlanFor(null);
      fetchStores();
    } catch (err) {
      toast.error(apiError(err, 'Failed to update plan'));
    } finally {
      setSavingPlan(false);
    }
  };

  const setField = (key, value) => setCreateForm(f => ({ ...f, [key]: value }));

  const copyText = async (text, label = 'Copied') => {
    try { await navigator.clipboard.writeText(text); toast.success(label); }
    catch { toast.error('Copy failed — please copy manually'); }
  };

  // Build a WhatsApp-ready single-message of login details. The login URL is
  // the current app's origin + /login so it works regardless of where this is
  // deployed (local dev, staging, prod).
  const buildShareText = (info) => {
    const url = `${window.location.origin}/login`;
    return [
      `MedStore Pro — Login Details`,
      ``,
      `Store: ${info.storeName}`,
      `URL:   ${url}`,
      `Email: ${info.adminEmail}`,
      `Password: ${info.adminPassword}`,
    ].join('\n');
  };

  const createPreviewExpiry = useMemo(
    () => computeEndDate(createForm.plan, createForm.trialDays),
    [createForm.plan, createForm.trialDays]
  );
  const editPreviewExpiry = useMemo(
    () => computeEndDate(editPlanForm.plan, editPlanForm.trialDays),
    [editPlanForm.plan, editPlanForm.trialDays]
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">All Stores</h1>
          <p className="text-gray-500 text-sm">
            {stores.length} registered stores
            {masterTotal !== null && (
              <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border
                ${masterTotal === 0
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-primary-50 border-primary-200 text-primary-700'}`}>
                <HiOutlineUpload className="w-3 h-3" />
                Master catalog: {masterTotal}
              </span>
            )}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <HiOutlinePlus className="w-4 h-4" /> Create Store
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Tile color="primary" icon={HiOutlineOfficeBuilding} label="Total" value={stores.length} />
        <Tile color="green"   icon={HiOutlineCheck}          label="Active"
          value={stores.filter(s => s.isApproved && s.isActive).length} />
        <Tile color="amber"   icon={HiOutlineOfficeBuilding} label="Pending"
          value={stores.filter(s => !s.isApproved).length} />
        <Tile color="red"     icon={HiOutlineBan}            label="Suspended"
          value={stores.filter(s => !s.isActive).length} />
      </div>

      <div className="card mb-4">
        <div className="relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9"
            placeholder="Search stores by name or email..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">Store</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Owner</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Expiry</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s => (
                <StoreRow
                  key={s._id} s={s}
                  onView={() => setSelected(s)}
                  onApprove={() => approve(s._id)}
                  onSuspend={() => suspend(s._id)}
                  onReactivate={() => reactivate(s._id)}
                  onEditPlan={() => openEditPlan(s)}
                  onToggleCatalog={() => setCatalog(s, !s.hasMasterCatalog)}
                  onResetPassword={() => openReset(s)}
                />
              ))}
              {!filtered.length && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No stores yet — click "Create Store" to add one.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <h3 className="font-heading font-bold text-lg mb-4">{selected.storeName}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
            {[
              ['Owner', selected.ownerName], ['Email', selected.email],
              ['Phone', selected.phone],
              ['Plan', selected.plan],
              ['Plan Price', selected.planPrice ? `Rs. ${selected.planPrice}` : '—'],
              ['Plan Started', selected.planStartDate ? formatDate(selected.planStartDate) : '—'],
              ['Plan Expiry', selected.planEndDate ? formatDate(selected.planEndDate) : '—'],
              selected.plan === 'Trial' && ['Trial Days', selected.trialDays || '—'],
              !selected.isActive && ['Suspended Reason', selected.suspendedReason || '—'],
            ].filter(Boolean).map(([k, v]) => (
              <div key={k}><p className="text-xs text-gray-400">{k}</p><p className="font-medium break-words">{v || '—'}</p></div>
            ))}
          </div>
          <button onClick={() => setSelected(null)} className="btn-secondary mt-4 w-full">Close</button>
        </Modal>
      )}

      {/* Create Store modal */}
      {showCreate && (
        <Modal wide onClose={() => !creating && setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg">Create New Store</h3>
              <button type="button" disabled={creating} onClick={() => setShowCreate(false)} className="btn-ghost p-2">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <Section title="Store">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Store Name" required>
                  <input className="input-field" required value={createForm.storeName}
                    onChange={(e) => setField('storeName', e.target.value)} />
                </Field>
                <Field label="Phone" required>
                  <input className="input-field" required value={createForm.phone}
                    onChange={(e) => setField('phone', e.target.value)} />
                </Field>
                <Field label="Owner Name" required>
                  <input className="input-field" required value={createForm.ownerName}
                    onChange={(e) => setField('ownerName', e.target.value)} />
                </Field>
              </div>
            </Section>

            <Section title="Plan & Billing">
              <PlanFields
                form={createForm}
                set={(k, v) => setField(k, v)}
                previewExpiry={createPreviewExpiry}
              />
            </Section>

            <Section title="Master Catalog Access">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  className="mt-0.5 w-4 h-4 text-primary-600 rounded"
                  checked={createForm.hasMasterCatalog}
                  onChange={(e) => setField('hasMasterCatalog', e.target.checked)}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    <HiOutlineUpload className="w-4 h-4 text-primary-600" />
                    Grant master catalog access
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    On hone par store create hote hi platform ki master medicines list (stock = 0) is store me copy ho jayegi.
                    Baad me bhi All Stores list se on/off kar sakte ho.
                  </p>
                </div>
              </label>
            </Section>

            <Section title="Store Admin Credentials">
              <p className="text-xs text-gray-500 mb-3">
                Yeh credentials store ke admin ko share karein. Login ke baad woh apna password change kar sakte hain.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Admin Name">
                  <input className="input-field" value={createForm.adminName}
                    onChange={(e) => setField('adminName', e.target.value)}
                    placeholder="Defaults to owner name" />
                </Field>
                <Field label="Admin Email" required>
                  <input type="email" className="input-field" required autoComplete="off"
                    value={createForm.adminEmail}
                    onChange={(e) => setField('adminEmail', e.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                  <label className="label"><span className="text-red-500 mr-0.5">*</span>Admin Password</label>
                  <div className="flex gap-2">
                    <input type="text" className="input-field flex-1" required minLength={6} autoComplete="new-password"
                      value={createForm.adminPassword}
                      onChange={(e) => setField('adminPassword', e.target.value)}
                      placeholder="Type or generate (min 6 chars)" />
                    <button type="button"
                      onClick={() => setField('adminPassword', generatePassword(10))}
                      title="Generate a random password"
                      className="px-3 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 text-sm font-medium whitespace-nowrap flex items-center gap-1.5">
                      <HiOutlineSparkles className="w-4 h-4" /> Generate
                    </button>
                  </div>
                </div>
              </div>
            </Section>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button type="button" disabled={creating} className="btn-secondary"
                onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? 'Creating…' : 'Create Store'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reset Password modal */}
      {resetFor && (
        <Modal onClose={() => !resettingPwd && setResetFor(null)}>
          <form onSubmit={submitReset}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                  <HiOutlineKey className="w-5 h-5 text-amber-500" /> Reset Admin Password
                </h3>
                <p className="text-xs text-gray-500">{resetFor.storeName}</p>
              </div>
              <button type="button" disabled={resettingPwd} onClick={() => setResetFor(null)} className="btn-ghost p-2">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Reset karne ke baad store admin sirf naya password use kar sake ga. Purana password kaam nahi karega.
            </p>

            <label className="label">New Password</label>
            <div className="flex gap-2 mb-4">
              <input
                type="text" required minLength={6} autoComplete="new-password"
                className="input-field flex-1"
                value={resetPwd}
                onChange={(e) => setResetPwd(e.target.value)} />
              <button type="button"
                onClick={() => setResetPwd(generatePassword(10))}
                className="px-3 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 text-sm font-medium whitespace-nowrap flex items-center gap-1.5">
                <HiOutlineSparkles className="w-4 h-4" /> Generate
              </button>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" disabled={resettingPwd} className="btn-secondary"
                onClick={() => setResetFor(null)}>Cancel</button>
              <button type="submit" disabled={resettingPwd} className="btn-primary">
                {resettingPwd ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Plan modal */}
      {editPlanFor && (
        <Modal onClose={() => !savingPlan && setEditPlanFor(null)}>
          <form onSubmit={submitPlanUpdate}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-bold text-lg">Change Plan</h3>
                <p className="text-xs text-gray-500">{editPlanFor.storeName}</p>
              </div>
              <button type="button" disabled={savingPlan} onClick={() => setEditPlanFor(null)} className="btn-ghost p-2">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Plan badalne se start date aaj reset ho jayegi aur expiry naye plan ke hisaab se calculate hogi.
              Agar store suspended tha to ye reactivate ho jayega.
            </p>

            <PlanFields
              form={editPlanForm}
              set={(k, v) => setEditPlanForm(f => ({ ...f, [k]: v }))}
              previewExpiry={editPreviewExpiry}
            />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <button type="button" disabled={savingPlan} className="btn-secondary"
                onClick={() => setEditPlanFor(null)}>Cancel</button>
              <button type="submit" disabled={savingPlan} className="btn-primary">
                {savingPlan ? 'Saving…' : 'Update Plan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* One-time credentials confirmation */}
      {createdInfo && (
        <Modal onClose={() => setCreatedInfo(null)}>
          <h3 className="font-heading font-bold text-lg mb-1">Store Created</h3>
          <p className="text-sm text-gray-500 mb-4">
            Yeh credentials store admin ko share karein — password sirf ek baar dikh raha hai.
          </p>

          <div className="space-y-2.5 mb-4">
            <CredRow label="Store"   value={createdInfo.storeName} />
            <CredRow label="Plan"    value={`${createdInfo.plan}${createdInfo.planPrice ? `  ·  Rs. ${createdInfo.planPrice}` : ''}`} />
            <CredRow label="Expiry"  value={createdInfo.planEndDate ? formatDate(createdInfo.planEndDate) : '—'} />
            <CredRow label="URL"     value={`${window.location.origin}/login`} onCopy={copyText} copyable />
            <CredRow label="Email"   value={createdInfo.adminEmail}    onCopy={copyText} copyable />
            <CredRow label="Password" value={createdInfo.adminPassword} onCopy={copyText} copyable mono />
          </div>

          {/* WhatsApp-ready single-message preview */}
          <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-primary-800 uppercase tracking-wider">Share Message</p>
              <button
                onClick={() => copyText(buildShareText(createdInfo), 'Login details copied — paste in WhatsApp')}
                className="text-xs font-medium px-2.5 py-1 rounded-md bg-primary-600 text-white hover:bg-primary-700 flex items-center gap-1">
                <HiOutlineClipboardCopy className="w-3.5 h-3.5" /> Copy for WhatsApp
              </button>
            </div>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all font-mono">{buildShareText(createdInfo)}</pre>
          </div>

          <button onClick={() => setCreatedInfo(null)} className="btn-primary mt-4 w-full">Done</button>
        </Modal>
      )}
    </div>
  );
}

// ─── PlanFields — shared between Create and Change-plan modals ──────────────

function PlanFields({ form, set, previewExpiry }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Plan" required>
        <select className="input-field" value={form.plan} onChange={(e) => set('plan', e.target.value)}>
          {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>

      {form.plan === 'Trial' ? (
        <Field label="Trial Days" required>
          <input type="number" min={1} className="input-field" value={form.trialDays}
            onChange={(e) => set('trialDays', e.target.value)} placeholder="e.g. 7" />
        </Field>
      ) : (
        <Field label="Plan Price (Rs.)">
          <input type="number" min={0} step="0.01" className="input-field" value={form.planPrice}
            onChange={(e) => set('planPrice', e.target.value)} placeholder="e.g. 5000" />
        </Field>
      )}

      {form.plan === 'Trial' && (
        <Field label="Plan Price (Rs.)">
          <input type="number" min={0} step="0.01" className="input-field" value={form.planPrice}
            onChange={(e) => set('planPrice', e.target.value)} placeholder="0 if free trial" />
        </Field>
      )}

      <div className="sm:col-span-2 rounded-lg bg-primary-50 border border-primary-100 px-3 py-2 text-sm text-primary-800">
        <span className="text-xs uppercase tracking-wider text-primary-600 font-semibold mr-2">Expires on</span>
        {previewExpiry ? previewExpiry.toLocaleDateString() : '—'}
        {form.plan === 'Trial' && <span className="text-xs text-primary-600/70 ml-2">(after {form.trialDays || '—'} days)</span>}
      </div>
    </div>
  );
}

// ─── StoreRow — table row with status + actions ─────────────────────────────

function StoreRow({ s, onView, onApprove, onSuspend, onReactivate, onEditPlan, onToggleCatalog, onResetPassword }) {
  const expired = s.planEndDate && new Date(s.planEndDate) < new Date();
  const initial = (s.adminName || s.storeName || '?').charAt(0).toUpperCase();
  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {s.adminAvatar ? (
            <img src={s.adminAvatar} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200 flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{s.storeName}</p>
            <p className="text-xs text-gray-400 truncate">{s.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
        {s.ownerName}
        <p className="text-xs text-gray-400">{s.ownerPhone}</p>
      </td>
      <td className="px-4 py-3">
        <span className={`badge ${s.plan === 'Trial' ? 'badge-amber' : s.plan === 'Yearly' ? 'badge-blue' : 'badge-gray'}`}>{s.plan || '—'}</span>
        {s.planPrice > 0 && <p className="text-[10px] text-gray-400 mt-0.5">Rs. {s.planPrice}</p>}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
        {s.planEndDate ? formatDate(s.planEndDate) : '—'}
        {expired && <p className="text-[10px] text-red-500 font-medium">Expired</p>}
      </td>
      <td className="px-4 py-3">
        {!s.isApproved ? (
          <span className="badge badge-amber">Pending</span>
        ) : !s.isActive ? (
          <>
            <span className="badge badge-red">Suspended</span>
            {s.suspendedReason && <p className="text-[10px] text-gray-400 mt-0.5 max-w-[140px]">{s.suspendedReason}</p>}
          </>
        ) : (
          <span className="badge badge-green">Active</span>
        )}
        <button
          onClick={onToggleCatalog}
          title={s.hasMasterCatalog ? 'Revoke catalog access' : 'Grant master catalog access'}
          className={`mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border transition
            ${s.hasMasterCatalog
              ? 'bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100'
              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
          <HiOutlineUpload className="w-3 h-3" />
          {s.hasMasterCatalog ? 'Catalog ON' : 'Catalog OFF'}
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <button onClick={onResetPassword} title="Reset admin password" className="p-1.5 rounded hover:bg-amber-50 text-amber-600">
            <HiOutlineKey className="w-4 h-4" />
          </button>
          <button onClick={onEditPlan} title="Change plan" className="p-1.5 rounded hover:bg-primary-50 text-primary-600">
            <HiOutlinePencilAlt className="w-4 h-4" />
          </button>
          {!s.isApproved && (
            <button onClick={onApprove} className="text-xs text-green-600 font-medium hover:underline px-1">Approve</button>
          )}
          {s.isApproved && s.isActive && (
            <button onClick={onSuspend} title="Suspend" className="p-1.5 rounded hover:bg-red-50 text-red-500">
              <HiOutlineBan className="w-4 h-4" />
            </button>
          )}
          {s.isApproved && !s.isActive && (
            <button onClick={onReactivate} title="Reactivate" className="p-1.5 rounded hover:bg-green-50 text-green-600">
              <HiOutlineRefresh className="w-4 h-4" />
            </button>
          )}
          <button onClick={onView} title="Details" className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
            <HiOutlineEye className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── small presentational helpers ───────────────────────────────────────────

function Tile({ icon: Icon, label, value, color }) {
  const palette = {
    primary: 'bg-primary-50 text-primary-600',
    green:   'bg-green-50 text-green-600',
    amber:   'bg-amber-50 text-amber-600',
    red:     'bg-red-50 text-red-600',
  }[color] || 'bg-gray-50 text-gray-500';
  const valueColor = { green: 'text-green-600', amber: 'text-amber-600', red: 'text-red-600' }[color] || '';
  return (
    <div className="stat-card">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${palette}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-xl font-heading font-bold ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}>
      <div className={`bg-white rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} p-4 sm:p-6 my-4 sm:my-8`}
        onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">{title}</h4>
      {children}
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

function CredRow({ label, value, onCopy, copyable, mono }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 sm:w-28 text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className={`flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 ${mono ? 'font-mono' : ''} text-sm break-all`}>
        {value}
      </span>
      {copyable && (
        <button type="button" onClick={() => onCopy(value)}
          className="btn-ghost p-2 flex-shrink-0" title="Copy">
          <HiOutlineClipboardCopy className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
