import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { HiOutlinePrinter } from 'react-icons/hi';

export default function ReceiptDesignerPage() {
  const [store, setStore] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/stores').then(r => { setStore(r.data.data); setSettings(r.data.data.settings || {}); }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try { await API.put('/stores/settings', settings); toast.success('Receipt design saved'); } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); } finally { setSaving(false); }
  };

  const update = (k, v) => setSettings({ ...settings, [k]: v });

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  // Preview data
  const preview = {
    storeName: store?.storeName || 'MedStore Pro',
    address: `${store?.address?.street || '123 Main St'}, ${store?.address?.city || 'Lahore'}`,
    phone: store?.phone || '+923001234567',
    dl: store?.drugLicenseNumber || 'DL-LHR-2024-001',
    gst: store?.gstNumber || 'GST123456',
    items: [
      { name: 'Panadol 500mg', batch: 'B001', qty: 2, price: 50, total: 100 },
      { name: 'Augmentin 625mg', batch: 'B045', qty: 1, price: 320, total: 320 },
      { name: 'Omez 20mg', batch: 'B012', qty: 3, price: 85, total: 255 },
    ],
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Receipt Designer</h1>
      <p className="text-gray-500 text-sm mb-6">Customize your thermal receipt layout</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-heading font-semibold text-gray-900 mb-3">Receipt Settings</h3>
            <div className="space-y-3">
              <div><label className="label">Receipt Width</label>
                <select className="input-field" value={settings.receiptWidth || '80mm'} onChange={(e) => update('receiptWidth', e.target.value)}>
                  <option value="58mm">58mm (Small Thermal)</option><option value="80mm">80mm (Standard Thermal)</option><option value="A4">A4 (Full Page)</option>
                </select>
              </div>
              <div><label className="label">Header Text (Line 1)</label>
                <input className="input-field" value={settings.receiptHeader || ''} onChange={(e) => update('receiptHeader', e.target.value)} placeholder="e.g. Trusted Healthcare Partner" />
              </div>
              <div><label className="label">Footer Text</label>
                <input className="input-field" value={settings.receiptFooter || ''} onChange={(e) => update('receiptFooter', e.target.value)} placeholder="Thank you for your purchase!" />
              </div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={settings.showLogoOnReceipt !== false} onChange={(e) => update('showLogoOnReceipt', e.target.checked)} className="w-4 h-4 text-primary-600 rounded" /><label className="text-sm text-gray-600">Show store logo</label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={settings.showDLOnReceipt !== false} onChange={(e) => update('showDLOnReceipt', e.target.checked)} className="w-4 h-4 text-primary-600 rounded" /><label className="text-sm text-gray-600">Show Drug License #</label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={settings.showGSTOnReceipt !== false} onChange={(e) => update('showGSTOnReceipt', e.target.checked)} className="w-4 h-4 text-primary-600 rounded" /><label className="text-sm text-gray-600">Show GST #</label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={settings.showBatchOnReceipt !== false} onChange={(e) => update('showBatchOnReceipt', e.target.checked)} className="w-4 h-4 text-primary-600 rounded" /><label className="text-sm text-gray-600">Show batch # on items</label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={settings.showExpiryOnReceipt !== false} onChange={(e) => update('showExpiryOnReceipt', e.target.checked)} className="w-4 h-4 text-primary-600 rounded" /><label className="text-sm text-gray-600">Show expiry date on items</label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={settings.showTaxBreakdown !== false} onChange={(e) => update('showTaxBreakdown', e.target.checked)} className="w-4 h-4 text-primary-600 rounded" /><label className="text-sm text-gray-600">Show tax breakdown</label></div>
            </div>
            <button onClick={save} disabled={saving} className="btn-primary mt-4 w-full">{saving ? 'Saving...' : 'Save Receipt Design'}</button>
          </div>
        </div>

        {/* Live Preview */}
        <div>
          <div className="card bg-gray-50 p-3">
            <h3 className="font-heading font-semibold text-gray-900 mb-3 flex items-center gap-2"><HiOutlinePrinter className="w-4 h-4" /> Live Preview</h3>
            <div className={`bg-white border border-gray-300 mx-auto p-4 shadow-inner ${settings.receiptWidth === '58mm' ? 'max-w-[220px]' : settings.receiptWidth === 'A4' ? 'max-w-full' : 'max-w-[300px]'}`}
              style={{ fontFamily: "'Courier New', monospace", fontSize: settings.receiptWidth === '58mm' ? '10px' : '11px' }}>
              {/* Store Header */}
              <div className="text-center mb-2">
                <p className="font-bold text-sm">{preview.storeName}</p>
                {settings.receiptHeader && <p className="text-[9px] italic">{settings.receiptHeader}</p>}
                <p className="text-[9px]">{preview.address}</p>
                <p className="text-[9px]">Ph: {preview.phone}</p>
                {settings.showDLOnReceipt !== false && <p className="text-[9px]">DL: {preview.dl}</p>}
                {settings.showGSTOnReceipt !== false && <p className="text-[9px]">GST: {preview.gst}</p>}
              </div>
              <div className="border-t border-dashed border-gray-400 my-1.5" />
              <div className="text-[9px] mb-1">
                <span>Inv: <b>INV-2504-00001</b></span><br />
                <span>{new Date().toLocaleString()}</span><br />
                <span>Customer: Walk-in | Cashier: Admin</span>
              </div>
              <div className="border-t border-dashed border-gray-400 my-1.5" />
              {/* Items */}
              <table className="w-full text-[9px]">
                <thead><tr className="font-bold border-b border-gray-300"><td>Item</td><td className="text-right">Qty</td><td className="text-right">Amt</td></tr></thead>
                <tbody>
                  {preview.items.map((it, i) => (
                    <tr key={i}><td className="py-0.5">{it.name}{settings.showBatchOnReceipt !== false && <><br /><span className="text-[8px] text-gray-500">B:{it.batch}</span></>}</td><td className="text-right">{it.qty}</td><td className="text-right">{it.total}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-dashed border-gray-400 my-1.5" />
              <table className="w-full text-[9px]">
                <tbody>
                  <tr><td>Subtotal</td><td className="text-right">Rs.675.00</td></tr>
                  {settings.showTaxBreakdown !== false && <tr><td>Tax (5%)</td><td className="text-right">Rs.33.75</td></tr>}
                  <tr className="font-bold text-xs"><td>TOTAL</td><td className="text-right">Rs.709.00</td></tr>
                  <tr><td>Cash</td><td className="text-right">Rs.750.00</td></tr>
                  <tr><td>Change</td><td className="text-right">Rs.41.00</td></tr>
                </tbody>
              </table>
              <div className="border-t border-dashed border-gray-400 my-1.5" />
              <p className="text-center text-[9px]">{settings.receiptFooter || 'Thank you for your purchase!'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
