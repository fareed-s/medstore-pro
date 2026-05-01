// Mirrors backend/config/modules.js — keep in sync.
export const MODULES = [
  { key: 'medicines',     label: 'Medicines' },
  { key: 'categories',    label: 'Categories' },
  { key: 'inventory',     label: 'Inventory' },
  { key: 'sales',         label: 'Sales & POS' },
  { key: 'customers',     label: 'Customers' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'suppliers',     label: 'Suppliers' },
  { key: 'purchase',      label: 'Purchase Orders' },
  { key: 'grn',           label: 'Receive Goods (GRN)' },
  { key: 'transfers',     label: 'Stock Transfers' },
  { key: 'cashRegister',  label: 'Cash Register' },
  { key: 'expenses',      label: 'Expenses' },
  { key: 'reports',       label: 'Reports' },
  { key: 'regulatory',    label: 'Regulatory' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'staff',         label: 'Staff' },
  { key: 'settings',      label: 'Settings' },
];

export const ACTIONS = ['view', 'add', 'edit', 'delete'];

export const emptyMatrix = () =>
  MODULES.reduce((acc, m) => {
    acc[m.key] = { view: false, add: false, edit: false, delete: false };
    return acc;
  }, {});

export const fullMatrix = () =>
  MODULES.reduce((acc, m) => {
    acc[m.key] = { view: true, add: true, edit: true, delete: true };
    return acc;
  }, {});

export const mergeMatrix = (base, override) => {
  const out = base ? JSON.parse(JSON.stringify(base)) : emptyMatrix();
  if (!override) return out;
  for (const k of Object.keys(override)) {
    if (!out[k]) out[k] = { view: false, add: false, edit: false, delete: false };
    out[k] = { ...out[k], ...override[k] };
  }
  return out;
};
