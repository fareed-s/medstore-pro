import { memo, useCallback } from 'react';
import { HiOutlinePencil, HiOutlineTrash, HiOutlineChevronRight } from 'react-icons/hi';
import { useAuth } from '../../../context/AuthContext';

export const CAT_ICONS = {
  Tablets: '💊', Capsules: '💊', 'Syrups & Suspensions': '🧴', Injections: '💉',
  'Creams & Ointments': '🧴', 'Eye/Ear Drops': '💧', Inhalers: '🫁', Suppositories: '💊',
  'Sachets & Powders': '📦', 'Surgical Items': '🩹', 'Medical Devices': '🩺',
  'Gels & Lotions': '🧴', Sprays: '🌬️', 'Baby Care': '👶',
  'Nutrition & Supplements': '🏋️', 'OTC Medicines': '🏪',
  'Cosmetics & Skin Care': '✨', 'Ayurvedic & Herbal': '🌿',
};

export const CAT_COLORS = [
  'bg-emerald-50 border-emerald-200', 'bg-blue-50 border-blue-200', 'bg-amber-50 border-amber-200',
  'bg-purple-50 border-purple-200',  'bg-rose-50 border-rose-200',  'bg-cyan-50 border-cyan-200',
  'bg-orange-50 border-orange-200',  'bg-pink-50 border-pink-200',  'bg-teal-50 border-teal-200',
  'bg-indigo-50 border-indigo-200',  'bg-lime-50 border-lime-200',  'bg-sky-50 border-sky-200',
];

function CategoryCard({ cat, isOpen, colorIndex, onOpen, onEdit, onDelete }) {
  const { hasRole } = useAuth();
  const handleOpen   = useCallback(() => onOpen(cat),       [onOpen, cat]);
  const handleEdit   = useCallback((e) => { e.stopPropagation(); onEdit(cat); },   [onEdit, cat]);
  const handleDelete = useCallback((e) => { e.stopPropagation(); onDelete(cat._id); }, [onDelete, cat._id]);
  const icon  = CAT_ICONS[cat.name] || '📦';
  const color = CAT_COLORS[colorIndex % CAT_COLORS.length];

  return (
    <div onClick={handleOpen}
      className={`card cursor-pointer transition-all duration-200 group border-2
        ${isOpen ? 'border-primary-400 ring-2 ring-primary-100 shadow-lg' : `${color} hover:shadow-cardHover hover:scale-[1.01]`}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl">{icon}</div>
          <div>
            <h3 className="font-heading font-semibold text-gray-900">{cat.name}</h3>
            {cat.description && <p className="text-[11px] text-gray-400 mt-0.5">{cat.description}</p>}
            <p className="text-xs font-medium text-primary-600 mt-1">{cat.productCount || 0} medicines</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {hasRole('StoreAdmin') && (
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={handleEdit}   className="p-1 rounded-lg hover:bg-white/80"><HiOutlinePencil className="w-3.5 h-3.5 text-gray-500" /></button>
              <button onClick={handleDelete} className="p-1 rounded-lg hover:bg-red-50"><HiOutlineTrash  className="w-3.5 h-3.5 text-red-500" /></button>
            </div>
          )}
          <HiOutlineChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </div>
      </div>
    </div>
  );
}

export default memo(CategoryCard);
