import { useCallback, useEffect, useState } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { HiOutlinePlus, HiOutlineRefresh, HiOutlineX } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import { apiError } from '../../utils/helpers';
import { confirm, confirmDanger } from '../../utils/swal';
import Spinner from '../../shared/components/Spinner';
import CategoryCard, { CAT_ICONS } from './components/CategoryCard';
import CategoryMedicineRow from './components/CategoryMedicineRow';

const blankForm = () => ({ name: '', description: '' });

export default function CategoriesPage() {
  const { hasRole } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(blankForm());

  const [selectedCat, setSelectedCat] = useState(null);
  const [catMedicines, setCatMedicines] = useState([]);
  const [catMedsLoading, setCatMedsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchCategories = useCallback(async () => {
    try { const { data } = await API.get('/categories'); setCategories(data.data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const syncMedicines = useCallback(async () => {
    if (!(await confirm(
      'Any missing standard categories will be created first, then unassigned medicines will be linked.',
      { title: 'Sync medicines to categories?', confirmText: 'Sync now' }
    ))) return;
    setSyncing(true);
    try {
      const { data } = await API.post('/categories/sync-medicines');
      toast.success(data.message || 'Sync complete');
      fetchCategories();
    } catch (err) { toast.error(apiError(err, 'Sync failed')); }
    finally { setSyncing(false); }
  }, [fetchCategories]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      if (editId) { await API.put(`/categories/${editId}`, form); toast.success('Updated'); }
      else        { await API.post('/categories', form);          toast.success('Created'); }
      setForm(blankForm()); setEditId(null); setShowForm(false);
      fetchCategories();
    } catch (err) { toast.error(apiError(err)); }
  }, [editId, form, fetchCategories]);

  const startEdit = useCallback((cat) => {
    setForm({ name: cat.name, description: cat.description || '' });
    setEditId(cat._id);
    setShowForm(true);
  }, []);

  const deleteCategory = useCallback(async (id) => {
    if (!(await confirmDanger('This category will be removed (only if it has no products).', { title: 'Delete category?', confirmText: 'Delete' }))) return;
    try { await API.delete(`/categories/${id}`); toast.success('Deleted'); fetchCategories(); }
    catch (err) { toast.error(apiError(err)); }
  }, [fetchCategories]);

  const openCategory = useCallback(async (cat) => {
    if (selectedCat?._id === cat._id) { setSelectedCat(null); return; }
    setSelectedCat(cat);
    setCatMedsLoading(true);
    try {
      const { data } = await API.get(`/medicines?categoryId=${cat._id}&limit=100`);
      let meds = data.data || [];
      if (!meds.length) {
        const fb = await API.get(`/medicines?category=${encodeURIComponent(cat.name)}&limit=100`);
        meds = fb.data?.data || [];
      }
      setCatMedicines(meds);
    } catch { setCatMedicines([]); }
    finally { setCatMedsLoading(false); }
  }, [selectedCat]);

  const closeForm  = useCallback(() => { setShowForm(false); setEditId(null); setForm(blankForm()); }, []);
  const toggleForm = useCallback(() => { setShowForm((v) => !v); setEditId(null); setForm(blankForm()); }, []);
  const closePanel = useCallback(() => setSelectedCat(null), []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Medicine Categories</h1>
          <p className="text-gray-500 text-sm">{categories.length} categories — click to view medicines</p>
        </div>
        {hasRole('StoreAdmin') && (
          <div className="flex items-center gap-2">
            <button onClick={syncMedicines} disabled={syncing} className="btn-secondary flex items-center gap-2"
              title="Link existing medicines to their matching categories">
              <HiOutlineRefresh className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Medicines'}
            </button>
            <button onClick={toggleForm} className="btn-primary flex items-center gap-2">
              <HiOutlinePlus className="w-4 h-4" /> Add Category
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-4">
          <h3 className="font-heading font-semibold text-gray-900 mb-3">{editId ? 'Edit Category' : 'New Category'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Name *</label>
              <input className="input-field" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input-field" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" className="btn-primary text-sm">{editId ? 'Update' : 'Create'}</button>
            <button type="button" onClick={closeForm} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <Spinner size="md" padding="lg" /> : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {categories.map((cat, idx) => (
              <CategoryCard key={cat._id} cat={cat} colorIndex={idx} isOpen={selectedCat?._id === cat._id}
                onOpen={openCategory} onEdit={startEdit} onDelete={deleteCategory} />
            ))}
          </div>

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
                <button onClick={closePanel} className="p-2 hover:bg-gray-100 rounded-xl">
                  <HiOutlineX className="w-5 h-5" />
                </button>
              </div>

              {catMedsLoading ? <Spinner size="sm" padding="sm" />
                : catMedicines.length === 0
                  ? <p className="text-center py-8 text-gray-400 text-sm">No medicines in this category</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="table-header">
                            <th className="px-4 py-2">Medicine</th>
                            <th className="px-4 py-2 hidden md:table-cell">Generic Name</th>
                            <th className="px-4 py-2 hidden lg:table-cell">Manufacturer</th>
                            <th className="px-4 py-2 text-center">Stock</th>
                            <th className="px-4 py-2 text-right">Price</th>
                            <th className="px-4 py-2 hidden md:table-cell">Schedule</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {catMedicines.map((med) => <CategoryMedicineRow key={med._id} medicine={med} />)}
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
