import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { SCHEDULES, apiError } from '../../utils/helpers';

// Map a Category.name (created by seed/admin) → the legacy Medicine.category enum.
// Used so saving a medicine keeps both `categoryId` and the enum field consistent.
const CATEGORY_NAME_TO_ENUM = {
  'Tablets': 'Tablet',
  'Capsules': 'Capsule',
  'Syrups & Suspensions': 'Syrup',
  'Injections': 'Injection',
  'Creams & Ointments': 'Cream/Ointment',
  'Eye/Ear Drops': 'Drops',
  'Inhalers': 'Inhaler',
  'Sprays': 'Spray',
  'Suppositories': 'Suppository',
  'Sachets & Powders': 'Sachet',
  'Surgical Items': 'Surgical',
  'Solutions': 'Solution',
  'Medical Devices': 'Device',
  'Patches': 'Patch',
  'Cosmetics & Skin Care': 'Cosmetic',
  'OTC Medicines': 'OTC',
  'Baby Care': 'Baby Care',
  'Nutrition & Supplements': 'Nutrition',
  'Gels & Lotions': 'Gel',
  'Ayurvedic & Herbal': 'OTC',
};

const STORAGE = ['Room Temperature','Refrigerate (2-8°C)','Freeze','Protect from Light','Cool & Dry Place'];
const DOSAGE_FORMS = ['Oral','Topical','Injectable','Ophthalmic','Otic','Nasal','Rectal','Inhalation','Sublingual','Transdermal'];
const UNITS = ['tablet','capsule','ml','mg','g','piece','strip','bottle','tube','vial','ampoule','sachet','pack'];

// Defined at module scope — declaring it inside MedicineFormPage would create a
// new component type on every render, causing React to unmount/remount the
// whole section subtree (and steal focus) on every keystroke.
function Section({ title, children }) {
  return (
    <div className="card mb-4">
      <h3 className="font-heading font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  );
}

export default function MedicineFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [scanning, setScanning] = useState(false);
  const barcodeRef = useRef(null);

  // USB barcode scanners act as keyboards: focus the input, scanner types the
  // code and ends with Enter. We swallow that Enter here so the form does not
  // accidentally submit mid-scan.
  const startScan = () => {
    setScanning(true);
    barcodeRef.current?.focus();
    barcodeRef.current?.select();
  };
  const handleBarcodeKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setScanning(false);
      if (barcodeRef.current?.value) toast.success(`Barcode captured: ${barcodeRef.current.value}`);
    }
  };

  const [form, setForm] = useState({
    medicineName: '', genericName: '', manufacturer: '', barcode: '', sku: '',
    category: 'Tablet', categoryId: '', subCategory: '', therapeuticClass: '',
    schedule: 'OTC', formulation: '', packSize: '10', unitsPerPack: 10,
    unitOfMeasure: 'tablet', strength: '', dosageForm: 'Oral',
    costPrice: 0, mrp: 0, salePrice: 0, wholesalePrice: 0, taxRate: 0, hsnCode: '',
    isDiscountAllowed: true, lowStockThreshold: 10, reorderLevel: 20,
    reorderQuantity: 50, rackLocation: '', storageCondition: 'Room Temperature',
    description: '', sideEffects: '', contraindications: '',
  });

  useEffect(() => {
    API.get('/categories').then(res => setCategories(res.data.data)).catch(() => {});
    if (isEdit) {
      setLoading(true);
      API.get(`/medicines/${id}`).then(res => {
        const m = res.data.data;
        setForm({
          medicineName: m.medicineName || '', genericName: m.genericName || '',
          manufacturer: m.manufacturer || '', barcode: m.barcode || '', sku: m.sku || '',
          category: m.category || 'Tablet',
          categoryId: m.categoryId?._id || m.categoryId || '',
          subCategory: m.subCategory || '',
          therapeuticClass: m.therapeuticClass || '', schedule: m.schedule || 'OTC',
          formulation: m.formulation || '', packSize: m.packSize || '10',
          unitsPerPack: m.unitsPerPack || 10, unitOfMeasure: m.unitOfMeasure || 'tablet',
          strength: m.strength || '', dosageForm: m.dosageForm || 'Oral',
          costPrice: m.costPrice || 0, mrp: m.mrp || 0, salePrice: m.salePrice || 0,
          wholesalePrice: m.wholesalePrice || 0, taxRate: m.taxRate || 0,
          hsnCode: m.hsnCode || '', isDiscountAllowed: m.isDiscountAllowed !== false,
          lowStockThreshold: m.lowStockThreshold || 10, reorderLevel: m.reorderLevel || 20,
          reorderQuantity: m.reorderQuantity || 50, rackLocation: m.rackLocation || '',
          storageCondition: m.storageCondition || 'Room Temperature',
          description: m.description || '', sideEffects: m.sideEffects || '',
          contraindications: m.contraindications || '',
        });
      }).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const update = (field) => (e) => {
    const val = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [field]: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.categoryId) {
      toast.error('Please pick a category');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      // Make sure the legacy `category` enum stays in sync with the picked category.
      const cat = categories.find((c) => c._id === form.categoryId);
      if (cat) payload.category = CATEGORY_NAME_TO_ENUM[cat.name] || form.category;

      if (isEdit) {
        await API.put(`/medicines/${id}`, payload);
        toast.success('Medicine updated');
      } else {
        await API.post('/medicines', payload);
        toast.success('Medicine added');
      }
      navigate('/medicines');
    } catch (err) {
      toast.error(apiError(err, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">{isEdit ? 'Edit Medicine' : 'Add New Medicine'}</h1>
          <p className="text-gray-500 text-sm">Fill in the medicine details below</p>
        </div>
        <button onClick={() => navigate('/medicines')} className="btn-secondary">Cancel</button>
      </div>

      <form onSubmit={handleSubmit}>
        <Section title="Core Identity">
          <div><label className="label">Medicine Name *</label><input className="input-field" value={form.medicineName} onChange={update('medicineName')} required /></div>
          <div><label className="label">Generic Name</label><input className="input-field" value={form.genericName} onChange={update('genericName')} /></div>
          <div><label className="label">Manufacturer</label><input className="input-field" value={form.manufacturer} onChange={update('manufacturer')} /></div>
          <div>
            <label className="label">Barcode</label>
            <div className="flex gap-2">
              <input
                ref={barcodeRef}
                className={`input-field flex-1 ${scanning ? 'ring-2 ring-primary-400 border-primary-400' : ''}`}
                placeholder={scanning ? 'Ready — point scanner at barcode…' : 'Type or scan barcode'}
                value={form.barcode}
                onChange={update('barcode')}
                onKeyDown={handleBarcodeKey}
                onBlur={() => setScanning(false)}
              />
              <button
                type="button"
                onClick={startScan}
                title="Focus field and capture from a USB barcode scanner"
                className="px-3 rounded-lg bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 text-sm font-medium whitespace-nowrap"
              >
                📷 Scan
              </button>
            </div>
            {scanning && <p className="text-[11px] text-primary-600 mt-1">Scanner ready — scan barcode now…</p>}
          </div>
          <div><label className="label">SKU</label><input className="input-field" value={form.sku} onChange={update('sku')} /></div>
          <div><label className="label">Strength</label><input className="input-field" placeholder="e.g. 500mg" value={form.strength} onChange={update('strength')} /></div>
        </Section>

        <Section title="Classification">
          <div>
            <label className="label"><span className="text-red-500 mr-0.5">*</span>Category</label>
            <select className="input-field" value={form.categoryId} onChange={update('categoryId')} required>
              <option value="">— Select category —</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label">Sub Category</label><input className="input-field" placeholder="e.g. Painkiller" value={form.subCategory} onChange={update('subCategory')} /></div>
          <div><label className="label">Therapeutic Class</label><input className="input-field" placeholder="e.g. NSAID" value={form.therapeuticClass} onChange={update('therapeuticClass')} /></div>
          <div><label className="label">Drug Schedule</label><select className="input-field" value={form.schedule} onChange={update('schedule')}>{SCHEDULES.map(s => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label">Dosage Form</label><select className="input-field" value={form.dosageForm} onChange={update('dosageForm')}>{DOSAGE_FORMS.map(d => <option key={d}>{d}</option>)}</select></div>
          <div><label className="label">Formulation</label><input className="input-field" placeholder="e.g. Tablet 500mg" value={form.formulation} onChange={update('formulation')} /></div>
        </Section>

        <Section title="Packaging">
          <div><label className="label">Pack Size</label><input className="input-field" value={form.packSize} onChange={update('packSize')} /></div>
          <div><label className="label">Units Per Pack</label><input type="number" className="input-field" value={form.unitsPerPack} onChange={update('unitsPerPack')} /></div>
          <div><label className="label">Unit of Measure</label><select className="input-field" value={form.unitOfMeasure} onChange={update('unitOfMeasure')}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
        </Section>

        <Section title="Pricing">
          <div><label className="label">Cost Price (Rs.)</label><input type="number" step="0.01" className="input-field" value={form.costPrice} onChange={update('costPrice')} /></div>
          <div><label className="label">MRP (Rs.)</label><input type="number" step="0.01" className="input-field" value={form.mrp} onChange={update('mrp')} /></div>
          <div><label className="label">Sale Price (Rs.)</label><input type="number" step="0.01" className="input-field" value={form.salePrice} onChange={update('salePrice')} /></div>
          <div><label className="label">Wholesale Price (Rs.)</label><input type="number" step="0.01" className="input-field" value={form.wholesalePrice} onChange={update('wholesalePrice')} /></div>
          <div><label className="label">Tax Rate (%)</label><input type="number" className="input-field" value={form.taxRate} onChange={update('taxRate')} /></div>
          <div><label className="label">HSN Code</label><input className="input-field" value={form.hsnCode} onChange={update('hsnCode')} /></div>
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" id="discountAllowed" checked={form.isDiscountAllowed} onChange={update('isDiscountAllowed')} className="w-4 h-4 text-primary-600 rounded" />
            <label htmlFor="discountAllowed" className="text-sm text-gray-600">Discount Allowed</label>
          </div>
          {form.costPrice > 0 && form.salePrice > 0 && (
            <div className="pt-6">
              <p className="text-sm text-gray-500">Margin: <span className="font-semibold text-primary-600">{(((form.salePrice - form.costPrice) / form.costPrice) * 100).toFixed(1)}%</span></p>
            </div>
          )}
        </Section>

        <Section title="Inventory Settings">
          <div><label className="label">Low Stock Threshold</label><input type="number" className="input-field" value={form.lowStockThreshold} onChange={update('lowStockThreshold')} /></div>
          <div><label className="label">Reorder Level</label><input type="number" className="input-field" value={form.reorderLevel} onChange={update('reorderLevel')} /></div>
          <div><label className="label">Reorder Quantity</label><input type="number" className="input-field" value={form.reorderQuantity} onChange={update('reorderQuantity')} /></div>
          <div><label className="label">Rack Location</label><input className="input-field" placeholder="e.g. Shelf A3, Row 2" value={form.rackLocation} onChange={update('rackLocation')} /></div>
          <div><label className="label">Storage Condition</label><select className="input-field" value={form.storageCondition} onChange={update('storageCondition')}>{STORAGE.map(s => <option key={s}>{s}</option>)}</select></div>
        </Section>

        <Section title="Additional Info">
          <div className="sm:col-span-2 lg:col-span-3"><label className="label">Description</label><textarea className="input-field" rows={3} value={form.description} onChange={update('description')} /></div>
          <div className="sm:col-span-2 lg:col-span-3"><label className="label">Side Effects</label><textarea className="input-field" rows={2} value={form.sideEffects} onChange={update('sideEffects')} /></div>
        </Section>

        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={() => navigate('/medicines')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary px-8">
            {saving ? 'Saving...' : isEdit ? 'Update Medicine' : 'Add Medicine'}
          </button>
        </div>
      </form>
    </div>
  );
}
