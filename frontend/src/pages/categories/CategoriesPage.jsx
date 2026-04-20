import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/helpers';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineTag, HiOutlineChevronRight, HiOutlineX, HiOutlineCube } from 'react-icons/hi';

const CAT_ICONS = {
  'Tablets': '💊', 'Capsules': '💊', 'Syrups & Suspensions': '🧴', 'Injections': '💉',
  'Creams & Ointments': '🧴', 'Eye/Ear Drops': '💧', 'Inhalers': '🫁', 'Suppositories': '💊',
  'Sachets & Powders': '📦', 'Surgical Items': '🩹', 'Medical Devices': '🩺', 'Gels & Lotions': '🧴',
  'Sprays': '🌬️', 'Baby Care': '👶', 'Nutrition & Supplements': '🏋️', 'OTC Medicines': '🏪',
  'Cosmetics & Skin Care': '✨', 'Ayurvedic & Herbal': '🌿',
};

const CAT_COLORS = [
  'bg-emerald-50 border-emerald-200', 'bg-blue-50 border-blue-200', 'bg-amber-50 border-amber-200',
  'bg-purple-50 border-purple-200', 'bg-rose-50 border-rose-200', 'bg-cyan-50 border-cyan-200',
  'bg-orange-50 border-orange-200', 'bg-pink-50 border-pink-200', 'bg-teal-50 border-teal-200',
  'bg-indigo-50 border-indigo-200', 'bg-lime-50 border-lime-200', 'bg-sky-50 border-sky-200',
];

export default function CategoriesPage() {
  const { hasRole } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  // Expanded category → medicines
  const [selectedCat, setSelectedCat] = useState(null);
  const [catMedicines, setCatMedicines] = useState([]);
  const [catMedsLoading, setCatMedsLoading] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try { const { data } = await API.get('/categories'); setCategories(data.data); } catch(err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) { await API.put(`/categories/${editId}`, form); toast.success('Updated'); }
      else { await API.post('/categories', form); toast.success('Created'); }
      setForm({ name: '', description: '' }); setEditId(null); setShowForm(false); fetchCategories();
    } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  const startEdit = (cat) => { setForm({ name: cat.name, description: cat.description || '' }); setEditId(cat._id); setShowForm(true); };

  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try { await API.delete(`/categories/${id}`); toast.success('Deleted'); fetchCategories(); } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
  };

  // Fetch medicines for a category
  const openCategory = async (cat) => {
    if (selectedCat?._id === cat._id) { setSelectedCat(null); return; }
    setSelectedCat(cat);
    setCatMedsLoading(true);
    try {
      const { data } = await API.get(`/medicines?category=${encodeURIComponent(cat.name)}&limit=50`);
      setCatMedicines(data.data);
    } catch { setCatMedicines([]); } finally { setCatMedsLoading(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Medicine Categories</h1>
          <p className="text-gray-500 text-sm">{categories.length} categories — click to view medicines</p>
        </div>
        {hasRole('StoreAdmin') && (
          <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', description: '' }); }} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" /> Add Category
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-4">
          <h3 className="font-heading font-semibold text-gray-900 mb-3">{editId ? 'Edit Category' : 'New Category'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Name *</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><label className="label">Description</label><input className="input-field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" className="btn-primary text-sm">{editId ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {categories.map((cat, idx) => {
              const isOpen = selectedCat?._id === cat._id;
              const icon = CAT_ICONS[cat.name] || '📦';
              const color = CAT_COLORS[idx % CAT_COLORS.length];

              return (
                <div key={cat._id}
                  onClick={() => openCategory(cat)}
                  className={`card cursor-pointer transition-all duration-200 group border-2 ${isOpen ? 'border-primary-400 ring-2 ring-primary-100 shadow-lg' : `${color} hover:shadow-cardHover hover:scale-[1.01]`}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl">
                        {icon}
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold text-gray-900">{cat.name}</h3>
                        {cat.description && <p className="text-[11px] text-gray-400 mt-0.5">{cat.description}</p>}
                        <p className="text-xs font-medium text-primary-600 mt-1">{cat.productCount || 0} medicines</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {hasRole('StoreAdmin') && (
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => startEdit(cat)} className="p-1 rounded-lg hover:bg-white/80"><HiOutlinePencil className="w-3.5 h-3.5 text-gray-500" /></button>
                          <button onClick={() => deleteCategory(cat._id)} className="p-1 rounded-lg hover:bg-red-50"><HiOutlineTrash className="w-3.5 h-3.5 text-red-500" /></button>
                        </div>
                      )}
                      <HiOutlineChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Expanded Medicines Panel ── */}
          {selectedCat && (
            <div className="card border-2 border-primary-100 mt-2 animate-in">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{CAT_ICONS[selectedCat.name] || '📦'}</span>
                  <div>
                    <h3 className="font-heading font-bold text-gray-900 text-lg">{selectedCat.name}</h3>
                    <p className="text-xs text-gray-400">{catMedicines.length} medicines in this category</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCat(null)} className="p-2 hover:bg-gray-100 rounded-xl"><HiOutlineX className="w-5 h-5" /></button>
              </div>

              {catMedsLoading ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>
              ) : catMedicines.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">No medicines in this category</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="table-header">
                      <th className="px-4 py-2">Medicine</th>
                      <th className="px-4 py-2 hidden md:table-cell">Generic Name</th>
                      <th className="px-4 py-2 hidden lg:table-cell">Manufacturer</th>
                      <th className="px-4 py-2 text-center">Stock</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 hidden md:table-cell">Schedule</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {catMedicines.map(med => (
                        <tr key={med._id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2">
                            <Link to={`/medicines/${med._id}`} className="font-medium text-primary-700 hover:underline">{med.medicineName}</Link>
                            <p className="text-[10px] text-gray-400 font-mono">{med.barcode}</p>
                          </td>
                          <td className="px-4 py-2 hidden md:table-cell text-gray-500 text-xs">{med.genericName}</td>
                          <td className="px-4 py-2 hidden lg:table-cell text-gray-400 text-xs">{med.manufacturer}</td>
                          <td className="px-4 py-2 text-center">
                            <span className={`font-bold ${med.currentStock <= 0 ? 'text-red-600' : med.currentStock <= (med.lowStockThreshold || 10) ? 'text-amber-600' : 'text-green-600'}`}>
                              {med.currentStock}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-primary-600">{formatCurrency(med.salePrice)}</td>
                          <td className="px-4 py-2 hidden md:table-cell">
                            <span className={`badge text-[9px] ${med.schedule === 'OTC' ? 'badge-green' : med.schedule?.includes('X') ? 'badge-red' : 'badge-amber'}`}>{med.schedule}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
