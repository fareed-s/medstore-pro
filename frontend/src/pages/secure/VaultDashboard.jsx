// Phase 1 placeholder — once Phases 2-4 land, this becomes the real
// dashboard with stats from ControlledMedicine / ControlledSale collections.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineCube, HiOutlineCash, HiOutlineClipboardList, HiOutlineTruck,
  HiOutlineDocumentReport, HiOutlineShieldCheck,
} from 'react-icons/hi';
import { controlledApi } from '../../context/ControlledModuleContext';

const tiles = [
  { to: '/secure/pos',       label: 'New Sale',      icon: HiOutlineCash,           hint: 'Record a controlled drug sale' },
  { to: '/secure/medicines', label: 'Medicines',     icon: HiOutlineCube,           hint: 'Manage controlled drug catalog' },
  { to: '/secure/sales',     label: 'Sales',         icon: HiOutlineClipboardList,  hint: 'Sales register' },
  { to: '/secure/purchases', label: 'Purchases',     icon: HiOutlineTruck,          hint: 'Receive narcotic stock' },
  { to: '/secure/reports',   label: 'Reports',       icon: HiOutlineDocumentReport, hint: 'Stock + register reports' },
  { to: '/secure/logs',      label: 'Access Logs',   icon: HiOutlineShieldCheck,    hint: 'Who accessed what' },
];

export default function VaultDashboard() {
  const [pinged, setPinged] = useState(false);

  // Verify the unlock end-to-end on first paint. Any failure forces the
  // context to lock and bounce back to /dashboard automatically.
  useEffect(() => {
    controlledApi.get('/ping').then(() => setPinged(true)).catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-white">Controlled Vault</h1>
        <p className="text-sm text-gray-400">Restricted area · every action is logged · session auto-locks after 15 min idle</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-red-500/40 hover:bg-gray-800 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-600/15 border border-red-500/20 flex items-center justify-center group-hover:bg-red-600/25">
                <t.icon className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-white">{t.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.hint}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2 h-2 rounded-full ${pinged ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
          <p className="text-sm text-gray-200 font-medium">
            {pinged ? 'Module session active' : 'Verifying session…'}
          </p>
        </div>
        <p className="text-xs text-gray-500">
          Phase 1 of this module is live. Catalog, POS, sales, purchases, and reports will arrive in subsequent phases.
        </p>
      </div>
    </div>
  );
}
