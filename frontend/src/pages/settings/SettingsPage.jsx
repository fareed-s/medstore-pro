import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';

export default function SettingsPage() {
  const [store, setStore] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/stores').then(res => {
      setStore(res.data.data);
      setSettings(res.data.data.settings || {});
    }).finally(() => setLoading(false));
  }, []);

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
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  const Section = ({ title, children }) => (
    <div className="card mb-4">
      <h3 className="font-heading font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Store Settings</h1>
      <p className="text-gray-500 text-sm mb-6">Manage your pharmacy profile and preferences</p>

      <form onSubmit={updateStore}>
        <Section title="Store Profile">
          <div><label className="label">Store Name</label><input className="input-field" value={store?.storeName || ''} onChange={(e) => setStore({ ...store, storeName: e.target.value })} /></div>
          <div><label className="label">Phone</label><input className="input-field" value={store?.phone || ''} onChange={(e) => setStore({ ...store, phone: e.target.value })} /></div>
          <div><label className="label">Email</label><input className="input-field" value={store?.email || ''} disabled className="input-field bg-gray-50" /></div>
          <div><label className="label">Drug License No.</label><input className="input-field" value={store?.drugLicenseNumber || ''} onChange={(e) => setStore({ ...store, drugLicenseNumber: e.target.value })} /></div>
          <div><label className="label">GST Number</label><input className="input-field" value={store?.gstNumber || ''} onChange={(e) => setStore({ ...store, gstNumber: e.target.value })} /></div>
          <div><label className="label">Plan</label><input className="input-field bg-gray-50" value={store?.plan || ''} disabled /></div>
          <div><label className="label">City</label><input className="input-field" value={store?.address?.city || ''} onChange={(e) => setStore({ ...store, address: { ...store.address, city: e.target.value } })} /></div>
          <div className="sm:col-span-2"><label className="label">Street Address</label><input className="input-field" value={store?.address?.street || ''} onChange={(e) => setStore({ ...store, address: { ...store.address, street: e.target.value } })} /></div>
        </Section>

        <Section title="POS & Billing">
          <div><label className="label">Default Payment Method</label>
            <select className="input-field" value={settings.defaultPaymentMethod || 'cash'} onChange={(e) => setSettings({ ...settings, defaultPaymentMethod: e.target.value })}>
              <option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option>
            </select>
          </div>
          <div><label className="label">Cashier Discount Limit (%)</label><input type="number" className="input-field" value={settings.cashierDiscountLimit || 10} onChange={(e) => setSettings({ ...settings, cashierDiscountLimit: parseInt(e.target.value) })} /></div>
          <div><label className="label">Receipt Width</label>
            <select className="input-field" value={settings.receiptWidth || '80mm'} onChange={(e) => setSettings({ ...settings, receiptWidth: e.target.value })}>
              <option value="58mm">58mm (Thermal)</option><option value="80mm">80mm (Thermal)</option><option value="A4">A4</option>
            </select>
          </div>
          <div className="flex items-center gap-2 pt-6"><input type="checkbox" checked={settings.requireCustomerForSale || false} onChange={(e) => setSettings({ ...settings, requireCustomerForSale: e.target.checked })} className="w-4 h-4 text-primary-600 rounded" /><label className="text-sm text-gray-600">Require customer for every sale</label></div>
          <div className="flex items-center gap-2 pt-6"><input type="checkbox" checked={settings.allowNegativeStock || false} onChange={(e) => setSettings({ ...settings, allowNegativeStock: e.target.checked })} className="w-4 h-4 text-primary-600 rounded" /><label className="text-sm text-gray-600">Allow negative stock</label></div>
        </Section>

        <Section title="Alerts & Notifications">
          <div><label className="label">Low Stock Alert Days</label><input type="number" className="input-field" value={settings.lowStockAlertDays || 30} onChange={(e) => setSettings({ ...settings, lowStockAlertDays: parseInt(e.target.value) })} /></div>
          <div><label className="label">Expiry Alert Days</label><input type="number" className="input-field" value={settings.expiryAlertDays || 90} onChange={(e) => setSettings({ ...settings, expiryAlertDays: parseInt(e.target.value) })} /></div>
          <div><label className="label">Reorder Lead Days</label><input type="number" className="input-field" value={settings.reorderLeadDays || 7} onChange={(e) => setSettings({ ...settings, reorderLeadDays: parseInt(e.target.value) })} /></div>
        </Section>

        <Section title="Tax & Receipt">
          <div><label className="label">Default Tax Rate (%)</label><input type="number" className="input-field" value={settings.defaultTaxRate || 0} onChange={(e) => setSettings({ ...settings, defaultTaxRate: parseFloat(e.target.value) })} /></div>
          <div className="flex items-center gap-2 pt-6"><input type="checkbox" checked={settings.taxInclusive || false} onChange={(e) => setSettings({ ...settings, taxInclusive: e.target.checked })} className="w-4 h-4 text-primary-600 rounded" /><label className="text-sm text-gray-600">Tax inclusive pricing</label></div>
          <div><label className="label">Receipt Footer</label><input className="input-field" value={settings.receiptFooter || ''} onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })} /></div>
        </Section>

        <Section title="Discounts">
          <div><label className="label">Senior Citizen Age (≥ this age gets discount)</label><input type="number" className="input-field" value={settings.seniorCitizenAge || 60} onChange={(e) => setSettings({ ...settings, seniorCitizenAge: parseInt(e.target.value) || 60 })} /></div>
          <div><label className="label">Senior Citizen Discount (%)</label><input type="number" className="input-field" value={settings.seniorCitizenDiscount || 5} onChange={(e) => setSettings({ ...settings, seniorCitizenDiscount: parseFloat(e.target.value) || 0 })} /></div>
          <div><label className="label">Employee Discount (%)</label><input type="number" className="input-field" value={settings.employeeDiscount || 10} onChange={(e) => setSettings({ ...settings, employeeDiscount: parseFloat(e.target.value) || 0 })} /></div>
        </Section>

        <Section title="Appearance">
          <div className="flex items-center gap-3 sm:col-span-3">
            <label className="text-sm font-medium text-gray-700 flex-1">Dark Mode</label>
            <button onClick={() => { const d = !settings.darkMode; setSettings({ ...settings, darkMode: d }); document.documentElement.classList.toggle('dark', d); }}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.darkMode ? 'bg-primary-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.darkMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </Section>

        <div className="flex justify-end mt-4">
          <button type="submit" disabled={saving} className="btn-primary px-8">{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      </form>
    </div>
  );
}
