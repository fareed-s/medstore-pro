import { useState, useEffect, useRef } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { apiError } from '../../utils/helpers';
import { HiOutlinePhotograph, HiOutlineUpload, HiOutlineX } from 'react-icons/hi';
import InvoicePreview from './components/InvoicePreview';

export default function SettingsPage() {
  const [store, setStore] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    API.get('/stores').then(res => {
      setStore(res.data.data);
      setSettings(res.data.data.settings || {});
    }).finally(() => setLoading(false));
  }, []);

  const setStoreField   = (field, value) => setStore(s => ({ ...s, [field]: value }));
  const setAddressField = (field, value) => setStore(s => ({ ...s, address: { ...s.address, [field]: value } }));
  const setSetting      = (key, value)  => setSettings(s => ({ ...s, [key]: value }));

  const updateStore = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.put('/stores', {
        storeName: store.storeName, phone: store.phone,
        drugLicenseNumber: store.drugLicenseNumber, gstNumber: store.gstNumber,
        address: store.address,
      });
      await API.put('/stores/settings', settings);
      toast.success('Settings saved');
    } catch(err) { toast.error(apiError(err)); } finally { setSaving(false); }
  };

  // Logo upload — sends multipart/form-data to /stores/logo, server returns
  // the public URL which we mirror into local state so the InvoicePreview
  // updates immediately (no page reload).
  const onLogoSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Logo must be under 3 MB'); return; }
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append('logo', file);
    try {
      const { data } = await API.post('/stores/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStoreField('logo', data.data.logo);
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(apiError(err, 'Logo upload failed'));
    } finally {
      setUploadingLogo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeLogo = () => setStoreField('logo', '');

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Store Settings</h1>
      <p className="text-gray-500 text-sm mb-6">Manage your pharmacy profile, invoice layout, and preferences</p>

      <form onSubmit={updateStore}>
        <Section title="Store Profile">
          <Field label="Store Name"><input className="input-field" value={store?.storeName || ''} onChange={(e) => setStoreField('storeName', e.target.value)} /></Field>
          <Field label="Phone"><input className="input-field" value={store?.phone || ''} onChange={(e) => setStoreField('phone', e.target.value)} /></Field>
          <Field label="Email"><input className="input-field bg-gray-50" value={store?.email || ''} disabled /></Field>
          <Field label="Drug License No."><input className="input-field" value={store?.drugLicenseNumber || ''} onChange={(e) => setStoreField('drugLicenseNumber', e.target.value)} /></Field>
          <Field label="GST Number"><input className="input-field" value={store?.gstNumber || ''} onChange={(e) => setStoreField('gstNumber', e.target.value)} /></Field>
          <Field label="Plan"><input className="input-field bg-gray-50" value={store?.plan || ''} disabled /></Field>
          <Field label="City"><input className="input-field" value={store?.address?.city || ''} onChange={(e) => setAddressField('city', e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Street Address"><input className="input-field" value={store?.address?.street || ''} onChange={(e) => setAddressField('street', e.target.value)} /></Field></div>
        </Section>

        <Section title="POS & Billing">
          <Field label="Default Payment Method">
            <select className="input-field" value={settings.defaultPaymentMethod || 'cash'} onChange={(e) => setSetting('defaultPaymentMethod', e.target.value)}>
              <option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option>
            </select>
          </Field>
          <Field label="Cashier Discount Limit (%)"><input type="number" className="input-field" value={settings.cashierDiscountLimit || 10} onChange={(e) => setSetting('cashierDiscountLimit', parseInt(e.target.value))} /></Field>
          <Field label="Receipt Width">
            <select className="input-field" value={settings.receiptWidth || '80mm'} onChange={(e) => setSetting('receiptWidth', e.target.value)}>
              <option value="58mm">58mm (Thermal)</option><option value="80mm">80mm (Thermal)</option><option value="A4">A4</option>
            </select>
          </Field>
          <ToggleField label="Require customer for every sale"
            checked={settings.requireCustomerForSale} onChange={(v) => setSetting('requireCustomerForSale', v)} />
          <ToggleField label="Allow negative stock"
            checked={settings.allowNegativeStock}     onChange={(v) => setSetting('allowNegativeStock', v)} />
        </Section>

        <Section title="Alerts & Notifications">
          <Field label="Low Stock Alert Days"><input type="number" className="input-field" value={settings.lowStockAlertDays || 30} onChange={(e) => setSetting('lowStockAlertDays', parseInt(e.target.value))} /></Field>
          <Field label="Expiry Alert Days"><input type="number" className="input-field" value={settings.expiryAlertDays || 90} onChange={(e) => setSetting('expiryAlertDays', parseInt(e.target.value))} /></Field>
          <Field label="Reorder Lead Days"><input type="number" className="input-field" value={settings.reorderLeadDays || 7} onChange={(e) => setSetting('reorderLeadDays', parseInt(e.target.value))} /></Field>
        </Section>

        <Section title="Tax">
          <Field label="Default Tax Rate (%)"><input type="number" className="input-field" value={settings.defaultTaxRate || 0} onChange={(e) => setSetting('defaultTaxRate', parseFloat(e.target.value))} /></Field>
          <ToggleField label="Tax inclusive pricing"
            checked={settings.taxInclusive} onChange={(v) => setSetting('taxInclusive', v)} />
        </Section>

        {/* ── Invoice / Receipt section with split layout: form left, live preview right ── */}
        <div className="card mb-4">
          <h3 className="font-heading font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Invoice / Receipt Layout</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form column */}
            <div className="space-y-4">
              {/* Logo upload */}
              <div>
                <label className="label">Store Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center bg-white dark:bg-gray-900 overflow-hidden flex-shrink-0">
                    {store?.logo ? (
                      <img src={store.logo} alt="logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <HiOutlinePhotograph className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={onLogoSelected}
                      className="hidden"
                    />
                    <button type="button" disabled={uploadingLogo}
                      onClick={() => fileRef.current?.click()}
                      className="btn-secondary text-sm flex items-center gap-2">
                      <HiOutlineUpload className="w-4 h-4" />
                      {uploadingLogo ? 'Uploading…' : (store?.logo ? 'Replace logo' : 'Upload logo')}
                    </button>
                    {store?.logo && (
                      <button type="button" onClick={removeLogo}
                        className="text-xs text-red-500 hover:underline flex items-center gap-1">
                        <HiOutlineX className="w-3 h-3" /> Remove
                      </button>
                    )}
                    <p className="text-[11px] text-gray-400">PNG / JPG / WEBP — max 3 MB. Recommended: square or wide rectangle.</p>
                  </div>
                </div>
              </div>

              {/* Logo position picker */}
              <div>
                <label className="label">Logo Position on Receipt</label>
                <div className="grid grid-cols-3 gap-2">
                  {['left', 'center', 'right'].map((pos) => (
                    <button key={pos} type="button"
                      onClick={() => setSetting('logoPosition', pos)}
                      className={`px-3 py-2 rounded-xl border text-sm font-medium capitalize transition
                        ${settings.logoPosition === pos
                          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Receipt Header (line above store name)">
                <input className="input-field" placeholder="e.g. Bismillah · Government Approved Pharmacy"
                  value={settings.receiptHeader || ''}
                  onChange={(e) => setSetting('receiptHeader', e.target.value)} />
              </Field>

              <Field label="Receipt Footer (thank-you / return policy)">
                <input className="input-field" placeholder="e.g. Thank you! Return within 7 days with this receipt."
                  value={settings.receiptFooter || ''}
                  onChange={(e) => setSetting('receiptFooter', e.target.value)} />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <ToggleField label="Show store logo"          checked={settings.showLogoOnReceipt   !== false} onChange={(v) => setSetting('showLogoOnReceipt', v)} />
                <ToggleField label="Show Drug License #"      checked={settings.showDLOnReceipt     !== false} onChange={(v) => setSetting('showDLOnReceipt', v)} />
                <ToggleField label="Show GST / tax number"    checked={settings.showGSTOnReceipt    !== false} onChange={(v) => setSetting('showGSTOnReceipt', v)} />
                <ToggleField label="Show batch numbers"       checked={settings.showBatchOnReceipt  !== false} onChange={(v) => setSetting('showBatchOnReceipt', v)} />
                <ToggleField label="Show expiry per item"     checked={settings.showExpiryOnReceipt || false}  onChange={(v) => setSetting('showExpiryOnReceipt', v)} />
                <ToggleField label="Itemised tax breakdown"   checked={settings.showTaxBreakdown    !== false} onChange={(v) => setSetting('showTaxBreakdown', v)} />
              </div>
            </div>

            {/* Live preview column */}
            <div className="lg:sticky lg:top-4 self-start">
              <InvoicePreview store={store} settings={settings} />
            </div>
          </div>
        </div>

        <Section title="Discounts">
          <Field label="Senior Citizen Age (≥ this age gets discount)"><input type="number" className="input-field" value={settings.seniorCitizenAge || 60} onChange={(e) => setSetting('seniorCitizenAge', parseInt(e.target.value) || 60)} /></Field>
          <Field label="Senior Citizen Discount (%)"><input type="number" className="input-field" value={settings.seniorCitizenDiscount || 5} onChange={(e) => setSetting('seniorCitizenDiscount', parseFloat(e.target.value) || 0)} /></Field>
          <Field label="Employee Discount (%)"><input type="number" className="input-field" value={settings.employeeDiscount || 10} onChange={(e) => setSetting('employeeDiscount', parseFloat(e.target.value) || 0)} /></Field>
        </Section>

        <div className="flex justify-end mt-4">
          <button type="submit" disabled={saving} className="btn-primary px-8">{saving ? 'Saving…' : 'Save Settings'}</button>
        </div>
      </form>
    </div>
  );
}

// ── Section wrappers (module scope so they don't remount per render) ──────
function Section({ title, children }) {
  return (
    <div className="card mb-4">
      <h3 className="font-heading font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-primary-600 rounded"
      />
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}
