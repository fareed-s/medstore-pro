// Layout shell for the hidden Controlled/Narcotic Drugs module.
// Completely separate from DashboardLayout — own dark sidebar, own header,
// own theming. Renders only when the module is unlocked.
//
// Top-right of header has TWO panic affordances:
//   1. "Quick Exit" — locks the module and bounces the user back to /dashboard
//   2. "Inspection Mode" (red) — flips the SuperAdmin-controlled inspectionMode
//      flag ON for this store. Locks immediately AND hides the lock icon
//      from the main app entirely until SuperAdmin disables it.
//
// Phase 1 ships an empty hub page; Phases 2-4 add real children under here.

import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  HiOutlineViewGrid, HiOutlineCube, HiOutlineCash, HiOutlineClipboardList,
  HiOutlineTruck, HiOutlineDocumentReport, HiOutlineShieldCheck, HiOutlineLogout,
  HiOutlineExclamation,
} from 'react-icons/hi';
import { useControlledModule, controlledApi } from '../../context/ControlledModuleContext';
import { confirmDanger } from '../../utils/swal';
import { toast } from 'react-toastify';
import { apiError } from '../../utils/helpers';

const nav = [
  { path: '/secure',            label: 'Vault Dashboard', icon: HiOutlineViewGrid, end: true },
  { path: '/secure/pos',        label: 'POS',             icon: HiOutlineCash },
  { path: '/secure/medicines',  label: 'Medicines',       icon: HiOutlineCube },
  { path: '/secure/sales',      label: 'Sales',           icon: HiOutlineClipboardList },
  { path: '/secure/purchases',  label: 'Purchases',       icon: HiOutlineTruck },
  { path: '/secure/reports',    label: 'Reports',         icon: HiOutlineDocumentReport },
  { path: '/secure/logs',       label: 'Access Logs',     icon: HiOutlineShieldCheck },
];

export default function SecureLayout() {
  const { unlocked, lock, status } = useControlledModule();
  const navigate = useNavigate();

  // If we land here without an active module session, bounce out.
  useEffect(() => {
    if (!unlocked) navigate('/dashboard', { replace: true });
  }, [unlocked, navigate]);

  // Force this layout into dark theme regardless of user preference — gives
  // the module a distinct "vault" feel and makes accidental screen sharing
  // visually obvious.
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.add('dark');
    return () => { if (!wasDark) root.classList.remove('dark'); };
  }, []);

  const handleQuickExit = async () => {
    await lock('quick-exit');
    navigate('/dashboard');
  };

  const handleInspectionMode = async () => {
    const ok = await confirmDanger(
      'This hides the entire module from the UI. Only the platform administrator can re-enable it. Use only during a regulatory inspection.',
      { title: 'Activate Inspection Mode?', confirmText: 'Activate', cancelText: 'Cancel' }
    );
    if (!ok) return;
    try {
      // One-way panic flip — only SuperAdmin can turn it back off later.
      await controlledApi.post('/auth/inspection-on');
      await lock('inspection-mode');
      toast.success('Inspection mode activated. Module is now hidden.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(apiError(err, 'Failed to activate inspection mode'));
    }
  };

  if (!unlocked) return null;

  return (
    <div className="h-screen flex bg-gray-950 text-gray-100 overflow-hidden">
      <aside className="hidden lg:flex w-60 flex-col border-r border-gray-800 bg-gray-900">
        <div className="px-5 py-5 border-b border-gray-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center">
            <HiOutlineShieldCheck className="w-5 h-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading font-bold text-white text-sm leading-tight">Controlled Vault</h2>
            <p className="text-[11px] text-red-400/80">Restricted area · Audited</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-red-600/20 text-red-300 border border-red-500/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800 space-y-2">
          <button
            onClick={handleInspectionMode}
            title="Hide module entirely (regulatory inspection)"
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium"
          >
            <HiOutlineExclamation className="w-4 h-4" /> Inspection Mode
          </button>
          <button
            onClick={handleQuickExit}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium border border-gray-700"
          >
            <HiOutlineLogout className="w-4 h-4" /> Quick Exit
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4 lg:px-6 gap-3 sticky top-0 z-30">
          <div className="lg:hidden flex items-center gap-2">
            <HiOutlineShieldCheck className="w-5 h-5 text-red-400" />
            <span className="font-heading font-bold text-white text-sm">Controlled Vault</span>
          </div>
          <div className="flex-1" />

          {/* Mobile: show Quick Exit / Inspection in header since sidebar is hidden */}
          <button
            onClick={handleInspectionMode}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium"
          >
            <HiOutlineExclamation className="w-4 h-4" /> Inspect
          </button>
          <button
            onClick={handleQuickExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs lg:text-sm font-medium border border-gray-700"
          >
            <HiOutlineLogout className="w-4 h-4" /> Exit
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet context={{ status }} />
        </main>
      </div>
    </div>
  );
}
