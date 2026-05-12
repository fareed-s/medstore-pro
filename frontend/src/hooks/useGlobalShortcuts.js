// Global keyboard shortcuts. Mounted once at the layout level so every
// authenticated page inherits the same navigation keys. Page-specific
// shortcuts (Ctrl+S on Quick Stock In, F-keys inside POS) are owned by
// the individual pages.

import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NAV_SHORTCUTS, SHORTCUTS_DISABLED_ON } from '../config/shortcuts';

// Don't fire while the user is actively typing — F-keys are fine but
// "?" and printable characters would clobber input. F-keys aren't
// produced by typing so we always let those through.
function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

export default function useGlobalShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (SHORTCUTS_DISABLED_ON.includes(location.pathname)) return;

    const byKey = new Map(NAV_SHORTCUTS.map((s) => [s.key, s.path]));

    const handler = (e) => {
      // Allow F-keys regardless of focus (they aren't a typing concern).
      const isFKey = /^F([1-9]|10|11|12)$/.test(e.key);
      if (!isFKey && isTypingTarget(e.target)) return;

      // "?" needs Shift+/, ignore plain "/" so it doesn't fire on search.
      const k = e.key === '?' && !e.shiftKey ? null : e.key;
      const path = byKey.get(k);
      if (!path) return;

      e.preventDefault();
      navigate(path);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, location.pathname]);
}
