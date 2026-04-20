const crypto = require('crypto');

// Generate unique barcode (EAN-13 format)
const generateBarcode = (prefix = '890') => {
  const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  const code = prefix + random;
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return code.substring(0, 12) + checkDigit;
};

// Generate SKU
const generateSKU = (category, index) => {
  const prefix = (category || 'GEN').substring(0, 3).toUpperCase();
  const num = String(index || Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `${prefix}-${num}`;
};

// Generate invoice number
const generateInvoiceNo = (storePrefix = 'INV', counter = 1) => {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${storePrefix}-${y}${m}-${String(counter).padStart(5, '0')}`;
};

// Pagination helper
const paginate = (query, page = 1, limit = 25) => {
  const skip = (page - 1) * limit;
  return { skip, limit: parseInt(limit) };
};

// Build pagination response
const paginationResult = (total, page, limit) => ({
  total,
  page: parseInt(page),
  limit: parseInt(limit),
  pages: Math.ceil(total / limit),
  hasMore: page * limit < total,
});

// Sanitize query for text search
const sanitizeSearch = (text) => {
  if (!text) return '';
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Generate random string
const randomString = (length = 32) => crypto.randomBytes(length).toString('hex');

// Format currency
const formatCurrency = (amount, symbol = 'Rs.') => {
  return `${symbol}${parseFloat(amount).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
};

module.exports = {
  generateBarcode,
  generateSKU,
  generateInvoiceNo,
  paginate,
  paginationResult,
  sanitizeSearch,
  randomString,
  formatCurrency,
};
