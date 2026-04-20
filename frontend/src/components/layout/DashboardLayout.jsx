import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/helpers';
import { HiOutlineViewGrid, HiOutlineCube, HiOutlineTag, HiOutlineArchive, HiOutlineClock, HiOutlineUsers, HiOutlineCog, HiOutlineLogout, HiOutlineMenu, HiOutlineX, HiOutlineBell, HiOutlineSearch, HiOutlineCash, HiOutlineClipboardList, HiOutlineSwitchHorizontal, HiOutlineClipboardCheck, HiOutlineTrendingDown, HiOutlineLocationMarker, HiOutlineShoppingCart, HiOutlineTruck, HiOutlineDocumentText, HiOutlineInboxIn, HiOutlineOfficeBuilding, HiOutlineCreditCard, HiOutlineChartBar } from 'react-icons/hi';

// ═══════════════════════════════════════════════════
// SUPERADMIN — Platform management only (SaaS owner)
// ═══════════════════════════════════════════════════
const superAdminNav = [
  { path: '/dashboard', label: 'Platform Overview', icon: HiOutlineViewGrid },
  { path: '/admin/stores', label: 'All Stores', icon: HiOutlineOfficeBuilding },
  { path: '/admin/users', label: 'All Users', icon: HiOutlineUsers },
  { path: '/admin/subscriptions', label: 'Subscriptions', icon: HiOutlineCreditCard },
  { path: '/admin/revenue', label: 'Platform Revenue', icon: HiOutlineChartBar },
  { path: '/activity-log', label: 'Audit Log', icon: HiOutlineClipboardList },
  { path: '/settings', label: 'Platform Settings', icon: HiOutlineCog },
];

// ═══════════════════════════════════════════════════
// STORE ROLES — Pharmacy features (StoreAdmin, Pharmacist, Cashier, InventoryStaff)
// ═══════════════════════════════════════════════════
const storeNav = [
  { path: '/dashboard', label: 'Dashboard', icon: HiOutlineViewGrid, roles: ['StoreAdmin','Pharmacist','Cashier','InventoryStaff'] },
  { path: '/pos', label: 'POS Terminal', icon: HiOutlineCash, roles: ['StoreAdmin','Pharmacist','Cashier'], external: true },
  { path: '/sales', label: 'Sales History', icon: HiOutlineClipboardList, roles: ['StoreAdmin','Pharmacist','Cashier'] },
  { path: '/medicines', label: 'Medicines', icon: HiOutlineCube, roles: ['StoreAdmin','Pharmacist','Cashier','InventoryStaff'] },
  { path: '/categories', label: 'Categories', icon: HiOutlineTag, roles: ['StoreAdmin','Pharmacist','InventoryStaff'] },
  { path: '/inventory', label: 'Inventory', icon: HiOutlineArchive, roles: ['StoreAdmin','Pharmacist','InventoryStaff'] },
  { path: '/inventory/expiry', label: 'Expiry Tracker', icon: HiOutlineClock, roles: ['StoreAdmin','Pharmacist','InventoryStaff'] },
  { path: '/inventory/movements', label: 'Stock Movements', icon: HiOutlineSwitchHorizontal, roles: ['StoreAdmin','InventoryStaff'] },
  { path: '/inventory/stock-count', label: 'Stock Count', icon: HiOutlineClipboardCheck, roles: ['StoreAdmin','InventoryStaff'] },
  { path: '/inventory/dead-stock', label: 'Stock Analysis', icon: HiOutlineTrendingDown, roles: ['StoreAdmin'] },
  { path: '/inventory/racks', label: 'Rack Locations', icon: HiOutlineLocationMarker, roles: ['StoreAdmin','InventoryStaff'] },
  { path: '/inventory/reorder', label: 'Reorder', icon: HiOutlineShoppingCart, roles: ['StoreAdmin'] },
  { path: '/purchase/suppliers', label: 'Suppliers', icon: HiOutlineTruck, roles: ['StoreAdmin'] },
  { path: '/purchase/orders', label: 'Purchase Orders', icon: HiOutlineDocumentText, roles: ['StoreAdmin'] },
  { path: '/purchase/grn', label: 'Receive Goods', icon: HiOutlineInboxIn, roles: ['StoreAdmin','InventoryStaff'] },
  { path: '/purchase/returns', label: 'Purchase Returns', icon: HiOutlineShoppingCart, roles: ['StoreAdmin'] },
  { path: '/customers', label: 'Customers', icon: HiOutlineUsers, roles: ['StoreAdmin','Pharmacist','Cashier'] },
  { path: '/insurance', label: 'Insurance', icon: HiOutlineUsers, roles: ['StoreAdmin'] },
  { path: '/transfers', label: 'Stock Transfer', icon: HiOutlineSwitchHorizontal, roles: ['StoreAdmin'] },
  { path: '/prescriptions', label: 'Prescriptions', icon: HiOutlineClipboardList, roles: ['StoreAdmin','Pharmacist'] },
  { path: '/finance/register', label: 'Cash Register', icon: HiOutlineCash, roles: ['StoreAdmin','Cashier'] },
  { path: '/finance/expenses', label: 'Expenses', icon: HiOutlineCash, roles: ['StoreAdmin'] },
  { path: '/finance/profit-loss', label: 'Profit & Loss', icon: HiOutlineTrendingDown, roles: ['StoreAdmin'] },
  { path: '/regulatory', label: 'Compliance', icon: HiOutlineShoppingCart, roles: ['StoreAdmin','Pharmacist'] },
  { path: '/reports', label: 'Reports', icon: HiOutlineClipboardList, roles: ['StoreAdmin'] },
  { path: '/staff', label: 'Staff', icon: HiOutlineUsers, roles: ['StoreAdmin'] },
  { path: '/receipt-designer', label: 'Receipt Design', icon: HiOutlineCash, roles: ['StoreAdmin'] },
  { path: '/barcode-labels', label: 'Barcode Labels', icon: HiOutlineClipboardList, roles: ['StoreAdmin','InventoryStaff'] },
  { path: '/activity-log', label: 'Audit Log', icon: HiOutlineClipboardList, roles: ['StoreAdmin'] },
  { path: '/settings', label: 'Settings', icon: HiOutlineCog, roles: ['StoreAdmin'] },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // SuperAdmin sees platform management, store roles see pharmacy features
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const filteredNav = isSuperAdmin
    ? superAdminNav
    : storeNav.filter((item) => item.roles.includes(user?.role));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
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

      {/* Nav — independent scrollable area */}
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

      {/* User */}
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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — fixed height, own scroll */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 h-screen overflow-hidden bg-gradient-to-b from-sidebar-from to-sidebar-to transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <SidebarContent />
      </aside>

      {/* Main — own scroll */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-ghost p-2">
            <HiOutlineMenu className="w-6 h-6" />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md relative hidden sm:block">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search medicines, products..." className="input-field pl-9 py-2 text-sm" />
          </div>

          <div className="flex-1 sm:hidden" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="btn-ghost p-2 relative">
              <HiOutlineBell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-gray-100">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page content — scrollable independently, isolated from sidebar */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto overscroll-contain"
          onWheel={(e) => e.stopPropagation()}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
