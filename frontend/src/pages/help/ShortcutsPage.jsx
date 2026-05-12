// Keyboard shortcuts reference. Reads straight from src/config/shortcuts.js
// so this page never goes out of date when shortcuts are added or moved.

import { Link } from 'react-router-dom';
import { HiOutlineKey, HiOutlineLightningBolt } from 'react-icons/hi';
import { NAV_SHORTCUTS, PAGE_SHORTCUTS } from '../../config/shortcuts';

export default function ShortcutsPage() {
  return (
    <div className="max-w-4xl">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
          <HiOutlineKey className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">Keyboard Shortcuts</h1>
          <p className="text-gray-500 text-sm">
            Speed up everyday work — every shortcut listed here is wired up and ready to use.
          </p>
        </div>
      </div>

      <div className="card mb-5">
        <div className="flex items-center gap-2 mb-3">
          <HiOutlineLightningBolt className="w-5 h-5 text-emerald-500" />
          <h3 className="font-heading font-semibold text-gray-900">Quick Navigation</h3>
          <span className="text-xs text-gray-400">— works anywhere except inside the POS Terminal</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {NAV_SHORTCUTS.map((s) => (
            <Link
              key={s.key}
              to={s.path}
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:border-primary-300 hover:bg-primary-50/40 transition-colors"
            >
              <span className="text-sm text-gray-700">{s.label}</span>
              <Kbd>{s.key}</Kbd>
            </Link>
          ))}
        </div>
      </div>

      {PAGE_SHORTCUTS.map((group) => (
        <div key={group.page} className="card mb-5">
          <h3 className="font-heading font-semibold text-gray-900 mb-3">
            On the <span className="text-primary-600">{group.page}</span> page
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.items.map((it) => (
              <div key={it.key} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50/60">
                <span className="text-sm text-gray-700">{it.label}</span>
                <Kbd>{it.key}</Kbd>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-xs text-gray-400 mt-6">
        💡 Tip: press <Kbd>?</Kbd> from any page to jump back here.
      </p>
    </div>
  );
}

function Kbd({ children }) {
  // Some shortcut labels carry a "+" like "Ctrl + S" — split so each key
  // gets its own keycap.
  const parts = String(children).split('+').map((p) => p.trim());
  return (
    <span className="flex items-center gap-1">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          <kbd className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-md border border-gray-200 bg-white text-[11px] font-mono font-semibold text-gray-700 shadow-sm">
            {p}
          </kbd>
          {i < parts.length - 1 && <span className="text-gray-300 text-xs">+</span>}
        </span>
      ))}
    </span>
  );
}
