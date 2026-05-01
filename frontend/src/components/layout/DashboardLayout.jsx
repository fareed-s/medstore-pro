import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/helpers';
import SubscriptionBanner from '../SubscriptionBanner';
import {
  HiOutlineViewGrid, HiOutlineCube, HiOutlineTag, HiOutlineArchive, HiOutlineClock,
  HiOutlineUsers, HiOutlineCog, HiOutlineLogout, HiOutlineMenu, HiOutlineBell,
  HiOutlineSearch, HiOutlineCash, HiOutlineClipboardList, HiOutlineSwitchHorizontal,
  HiOutlineClipboardCheck, HiOutlineTrendingDown, HiOutlineLocationMarker,
  HiOutlineShoppingCart, HiOutlineTruck, HiOutlineDocumentText, HiOutlineInboxIn,
  HiOutlineOfficeBuilding, HiOutlineUpload, HiOutlineLightningBolt,
  HiOutlineUser
} from 'react-icons/hi';

// SuperAdmin (SaaS owner) navigation — kept lean: only what we actively use.
const superAdminNav = [
  { path: '/dashboard',            label: 'Platform Overview', icon: HiOutlineViewGrid },
  { path: '/admin/stores',         label: 'All Stores',        icon: HiOutlineOfficeBuilding },
  { path: '/admin/master-catalog', label: 'Master Catalog',    icon: HiOutlineUpload },
];

// Store-side navigation. `module` ties each entry to a permission key.
// Items with no `module` are always visible to roles permitted to log in.
const storeNav = [
  { path: '/dashboard',              label: 'Dashboard',         icon: HiOutlineViewGrid },
  { path: '/pos',                    label: 'POS Terminal',      icon: HiOutlineCash,             module: 'sales',         action: 'add' },
  { path: '/sales',                  label: 'Sales History',     icon: HiOutlineClipboardList,    module: 'sales' },
  { path: '/medicines',              label: 'Medicines',         icon: HiOutlineCube,             module: 'medicines' },
  { path: '/categories',             label: 'Categories',        icon: HiOutlineTag,              module: 'categories' },
  { path: '/inventory',              label: 'Inventory',         icon: HiOutlineArchive,          module: 'inventory' },
  { path: '/inventory/quick-stock-in', label: 'Quick Stock In',  icon: HiOutlineLightningBolt,    module: 'inventory',     action: 'add' },
  { path: '/inventory/expiry',       label: 'Expiry Tracker',    icon: HiOutlineClock,            module: 'inventory' },
  { path: '/inventory/movements',    label: 'Stock Movements',   icon: HiOutlineSwitchHorizontal, module: 'inventory' },
  { path: '/inventory/stock-count',  label: 'Stock Count',       icon: HiOutlineClipboardCheck,   module: 'inventory' },
  { path: '/inventory/dead-stock',   label: 'Stock Analysis',    icon: HiOutlineTrendingDown,     module: 'inventory' },
  { path: '/inventory/racks',        label: 'Rack Locations',    icon: HiOutlineLocationMarker,   module: 'inventory' },
  { path: '/inventory/reorder',      label: 'Reorder',           icon: HiOutlineShoppingCart,     module: 'inventory' },
  { path: '/purchase/suppliers',     label: 'Suppliers',         icon: HiOutlineTruck,            module: 'suppliers' },
  { path: '/purchase/orders',        label: 'Purchase Orders',   icon: HiOutlineDocumentText,     module: 'purchase' },
  { path: '/purchase/grn',           label: 'Receive Goods',     icon: HiOutlineInboxIn,          module: 'grn' },
  { path: '/purchase/returns',       label: 'Purchase Returns',  icon: HiOutlineShoppingCart,     module: 'purchase' },
  { path: '/customers',              label: 'Customers',         icon: HiOutlineUsers,            module: 'customers' },
  { path: '/insurance',              label: 'Insurance',         icon: HiOutlineUsers,            module: 'customers' },
  { path: '/transfers',              label: 'Stock Transfer',    icon: HiOutlineSwitchHorizontal, module: 'transfers' },
  { path: '/prescriptions',          label: 'Prescriptions',     icon: HiOutlineClipboardList,    module: 'prescriptions' },
  { path: '/finance/register',       label: 'Cash Register',     icon: HiOutlineCash,             module: 'cashRegister' },
  { path: '/finance/expenses',       label: 'Expenses',          icon: HiOutlineCash,             module: 'expenses' },
  { path: '/finance/profit-loss',    label: 'Profit & Loss',     icon: HiOutlineTrendingDown,     module: 'reports' },
  { path: '/regulatory',             label: 'Compliance',        icon: HiOutlineShoppingCart,     module: 'regulatory' },
  { path: '/reports',                label: 'Reports',           icon: HiOutlineClipboardList,    module: 'reports' },
  { path: '/staff',                  label: 'Staff',             icon: HiOutlineUsers,            module: 'staff' },
  { path: '/receipt-designer',       label: 'Receipt Design',    icon: HiOutlineCash,             module: 'settings' },
  { path: '/barcode-labels',         label: 'Barcode Labels',    icon: HiOutlineClipboardList,    module: 'medicines' },
  { path: '/activity-log',           label: 'Audit Log',         icon: HiOutlineClipboardList,    module: 'settings' },
  { path: '/settings',               label: 'Settings',          icon: HiOutlineCog,              module: 'settings' },
];

export default function DashboardLayout() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const isStoreAdmin = user?.role === 'StoreAdmin';
  const filteredNav = isSuperAdmin
    ? superAdminNav
    : storeNav.filter(item => !item.module || isStoreAdmin || can(item.module, item.action || 'view'));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="text-white font-heading font-bold text-lg">M</span>
          </div>
          <div>
            <h1 className="text-white font-heading font-bold text-lg leading-tight">MedStore Pro</h1>
            <p className="text-emerald-300/60 text-xs">Pharmacy Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overscroll-contain scrollbar-thin"
        onWheel={(e) => e.stopPropagation()}>
        {filteredNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-emerald-400/20 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-emerald-300/50 text-xs">{ROLE_LABELS[user?.role]}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-link w-full text-red-300/80 hover:text-red-200 hover:bg-red-500/10">
          <HiOutlineLogout className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-surface-light overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 h-screen overflow-hidden bg-gradient-to-b from-sidebar-from to-sidebar-to transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-ghost p-2">
            <HiOutlineMenu className="w-6 h-6" />
          </button>

          <div className="flex-1 max-w-md relative hidden sm:block">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search medicines, products..." className="input-field pl-9 py-2 text-sm" />
          </div>

          <div className="flex-1 sm:hidden" />

          <div className="flex items-center gap-2 ml-auto">
            <button onClick={() => navigate('/notifications')} className="btn-ghost p-2 relative" title="Notifications">
              <HiOutlineBell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <ProfileMenu user={user} onLogout={handleLogout} navigate={navigate} />
          </div>
        </header>

        <SubscriptionBanner />

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto overscroll-contain"
          onWheel={(e) => e.stopPropagation()}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ─── ProfileMenu — avatar button + dropdown (Profile / Settings / Logout) ───
function ProfileMenu({ user, onLogout, navigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click / Escape so the menu feels native.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';
  const go = (path) => { setOpen(false); navigate(path); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-gray-100"
        title="Account">
        {user?.avatar ? (
          <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
        ) : (
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
            {initial}
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 hidden sm:inline max-w-[120px] truncate">{user?.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-40">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            <p className="text-[10px] uppercase tracking-wider text-primary-600 mt-1">{ROLE_LABELS[user?.role] || user?.role}</p>
          </div>
          <button onClick={() => go('/profile')} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">
            <HiOutlineUser className="w-4 h-4 text-gray-400" /> Profile
          </button>
          {user?.role !== 'SuperAdmin' && (
            <button onClick={() => go('/settings')} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">
              <HiOutlineCog className="w-4 h-4 text-gray-400" /> Settings
            </button>
          )}
          <button onClick={() => { setOpen(false); onLogout(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 border-t border-gray-100">
            <HiOutlineLogout className="w-4 h-4" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
