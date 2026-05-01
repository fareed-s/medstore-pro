// Single source of truth for permission modules.
// Frontend mirrors this file at frontend/src/utils/modules.js — keep in sync.

const MODULES = [
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

const ACTIONS = ['view', 'add', 'edit', 'delete'];

const emptyPermissions = () =>
  MODULES.reduce((acc, m) => {
    acc[m.key] = { view: false, add: false, edit: false, delete: false };
    return acc;
  }, {});

const fullPermissions = () =>
  MODULES.reduce((acc, m) => {
    acc[m.key] = { view: true, add: true, edit: true, delete: true };
    return acc;
  }, {});

// Sensible defaults per built-in role. Custom users can override per-module.
const ROLE_DEFAULTS = {
  SuperAdmin: () => fullPermissions(),
  StoreAdmin: () => fullPermissions(),
  Pharmacist: () => {
    const p = emptyPermissions();
    ['medicines','categories','inventory','sales','customers','prescriptions','regulatory','notifications']
      .forEach(k => { p[k] = { view: true, add: true, edit: true, delete: false }; });
    p.reports = { view: true, add: false, edit: false, delete: false };
    return p;
  },
  Cashier: () => {
    const p = emptyPermissions();
    p.sales        = { view: true, add: true, edit: false, delete: false };
    p.customers    = { view: true, add: true, edit: true,  delete: false };
    p.medicines    = { view: true, add: false, edit: false, delete: false };
    p.cashRegister = { view: true, add: true,  edit: true,  delete: false };
    p.notifications= { view: true, add: false, edit: false, delete: false };
    return p;
  },
  InventoryStaff: () => {
    const p = emptyPermissions();
    ['medicines','categories','inventory','suppliers','grn','transfers']
      .forEach(k => { p[k] = { view: true, add: true, edit: true, delete: false }; });
    p.notifications = { view: true, add: false, edit: false, delete: false };
    return p;
  },
};

const defaultPermissionsFor = (role) =>
  (ROLE_DEFAULTS[role] || ROLE_DEFAULTS.Cashier)();

module.exports = { MODULES, ACTIONS, emptyPermissions, fullPermissions, defaultPermissionsFor };
