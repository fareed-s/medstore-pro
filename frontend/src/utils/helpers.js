import { format, formatDistanceToNow, differenceInDays } from 'date-fns';

export const formatCurrency = (amount, symbol = 'Rs.') => {
  const num = parseFloat(amount) || 0;
  return `${symbol}${num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'dd/MM/yyyy');
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'dd/MM/yyyy hh:mm a');
};

export const timeAgo = (date) => {
  if (!date) return '';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return { label: 'N/A', color: 'gray' };
  const days = differenceInDays(new Date(expiryDate), new Date());
  if (days < 0) return { label: 'Expired', color: 'red', days };
  if (days <= 30) return { label: `${days}d left`, color: 'red', days };
  if (days <= 60) return { label: `${days}d left`, color: 'amber', days };
  if (days <= 90) return { label: `${days}d left`, color: 'yellow', days };
  return { label: `${days}d`, color: 'green', days };
};

export const getStockStatus = (current, threshold) => {
  if (current === 0) return { label: 'Out of Stock', color: 'red' };
  if (current <= threshold) return { label: 'Low Stock', color: 'amber' };
  return { label: 'In Stock', color: 'green' };
};

export const getScheduleBadge = (schedule) => {
  const map = {
    'OTC': { bg: 'bg-green-100', text: 'text-green-700' },
    'Schedule-G': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'Schedule-H': { bg: 'bg-amber-100', text: 'text-amber-700' },
    'Schedule-H1': { bg: 'bg-orange-100', text: 'text-orange-700' },
    'Schedule-X': { bg: 'bg-red-100', text: 'text-red-700' },
  };
  return map[schedule] || map['OTC'];
};

export const ROLE_LABELS = {
  SuperAdmin: 'Super Admin',
  StoreAdmin: 'Store Admin',
  Pharmacist: 'Pharmacist',
  Cashier: 'Cashier',
  InventoryStaff: 'Inventory Staff',
};

export const CATEGORIES = [
  'Tablet','Capsule','Syrup','Injection','Cream/Ointment','Drops',
  'Inhaler','Suppository','Sachet','Powder','Surgical','Device',
  'Cosmetic','OTC','Baby Care','Nutrition','Gel','Lotion','Solution','Spray',
];

export const SCHEDULES = ['OTC','Schedule-G','Schedule-H','Schedule-H1','Schedule-X'];

// Extract a user-facing error message from an axios/fetch error.
export const apiError = (err, fallback = 'Operation failed') =>
  err?.response?.data?.message || err?.message || fallback;
