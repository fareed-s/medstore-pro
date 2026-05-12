// Single source of truth for keyboard shortcuts across the app. The
// Shortcuts reference page renders this list directly and the
// useGlobalShortcuts hook reads it to set up the listeners — so adding
// a new entry here makes it both functional AND documented.
//
// Convention:
//   - F-keys for navigation (one-handed, no modifier needed)
//   - Ctrl/Cmd combos for in-page actions (save, add-row, etc.)
//   - "?" (Shift+/) jumps straight to this reference page

export const NAV_SHORTCUTS = [
  { key: 'F1',  label: 'POS Terminal',        path: '/pos' },
  { key: 'F2',  label: 'Quick Stock In',      path: '/inventory/quick-stock-in' },
  { key: 'F3',  label: 'Medicines',           path: '/medicines' },
  { key: 'F4',  label: 'Sales History',       path: '/sales' },
  { key: 'F5',  label: 'Expiry Tracker',      path: '/inventory/expiry' },
  { key: 'F6',  label: 'Reorder',             path: '/inventory/reorder' },
  { key: 'F7',  label: 'Reports',             path: '/reports' },
  { key: 'F8',  label: 'Customers',           path: '/customers' },
  { key: 'F9',  label: 'Dashboard',           path: '/dashboard' },
  { key: '?',   label: 'Shortcut keys help',  path: '/shortcuts' },
];

// Page-scoped shortcuts — wired up inside each page's own component
// because they need access to that page's state (e.g. save the current
// form). Listed here for the reference page only.
export const PAGE_SHORTCUTS = [
  {
    page: 'Quick Stock In',
    items: [
      { key: 'Ctrl + S',     label: 'Save all entries' },
      { key: 'Ctrl + Enter', label: 'Add a new blank row' },
    ],
  },
  {
    page: 'POS Terminal',
    items: [
      { key: 'F2',     label: 'Focus search / scan box' },
      { key: 'F5',     label: 'Hold current bill' },
      { key: 'F10',    label: 'Complete sale' },
      { key: 'Escape', label: 'Close open modal / receipt' },
    ],
  },
];

// Routes where global F-key navigation is suppressed because the page
// owns its own dense keyboard layout (POS uses F2/F5/F10 internally).
export const SHORTCUTS_DISABLED_ON = ['/pos'];
