// Template definition for bulk medicine import.
// Keep this as the single source of truth so the download template, the upload
// parser, and the on-screen instructions all agree.

// xlsx is loaded lazily so it stays out of the initial bundle (~440KB gzipped)
// and only ships when the user actually opens the bulk-upload modal.
let _xlsxPromise;
function loadXLSX() {
  if (!_xlsxPromise) {
    _xlsxPromise = import('xlsx').then((m) => m.default || m);
  }
  return _xlsxPromise;
}

// Each column: { key, label, required, hint }
// `key` matches the field name on the backend Medicine model.
// `label` is what the user sees in the spreadsheet header.
export const TEMPLATE_COLUMNS = [
  { key: 'medicineName',       label: 'Medicine Name',      required: true,  hint: 'e.g. Panadol 500mg' },
  { key: 'genericName',        label: 'Generic Name',       hint: 'e.g. Paracetamol' },
  { key: 'manufacturer',       label: 'Manufacturer',       hint: 'e.g. GSK Pakistan' },
  { key: 'barcode',            label: 'Barcode',            hint: 'Leave blank to auto-generate' },
  { key: 'category',           label: 'Category',           required: true,  hint: 'Tablets / Capsules / Syrups & Suspensions / Injections / etc.' },
  { key: 'schedule',           label: 'Schedule',           hint: 'OTC / Schedule-G / Schedule-H / Schedule-H1 / Schedule-X' },
  { key: 'strength',           label: 'Strength',           hint: 'e.g. 500mg' },
  { key: 'dosageForm',         label: 'Dosage Form',        hint: 'Oral / Topical / Injectable / Ophthalmic / Inhalation / Nasal / Rectal' },
  { key: 'packSize',           label: 'Pack Size',          hint: 'e.g. 10 or "1 bottle"' },
  { key: 'unitsPerPack',       label: 'Units Per Pack',     hint: 'Number, e.g. 10' },
  { key: 'unitOfMeasure',      label: 'Unit Of Measure',    hint: 'tablet / capsule / ml / piece / bottle / tube / vial / sachet / pack' },
  { key: 'costPrice',          label: 'Cost Price',         required: true, hint: 'Number' },
  { key: 'mrp',                label: 'MRP',                required: true, hint: 'Maximum Retail Price (number)' },
  { key: 'salePrice',          label: 'Sale Price',         required: true, hint: 'Number' },
  { key: 'taxRate',            label: 'Tax Rate %',         hint: 'Number, e.g. 0, 5, 12' },
  { key: 'lowStockThreshold',  label: 'Low Stock Threshold',hint: 'Number — alert when stock falls below this' },
  { key: 'reorderLevel',       label: 'Reorder Level',      hint: 'Number' },
  { key: 'reorderQuantity',    label: 'Reorder Quantity',   hint: 'Number' },
  { key: 'rackLocation',       label: 'Rack Location',      hint: 'e.g. Shelf A1, Row 2' },
  { key: 'storageCondition',   label: 'Storage Condition',  hint: 'Room Temperature / Refrigerate (2-8°C) / Freeze / Cool & Dry Place' },
];

const SAMPLE_ROWS = [
  {
    medicineName: 'Panadol 500mg', genericName: 'Paracetamol', manufacturer: 'GSK Pakistan',
    barcode: '', category: 'Tablets', schedule: 'OTC', strength: '500mg', dosageForm: 'Oral',
    packSize: '10', unitsPerPack: 10, unitOfMeasure: 'tablet',
    costPrice: 12.5, mrp: 18, salePrice: 17, taxRate: 0,
    lowStockThreshold: 20, reorderLevel: 50, reorderQuantity: 100,
    rackLocation: 'Shelf A1, Row 1', storageCondition: 'Room Temperature',
  },
  {
    medicineName: 'Ventolin Inhaler', genericName: 'Salbutamol', manufacturer: 'GSK Pakistan',
    barcode: '', category: 'Inhalers', schedule: 'Schedule-H', strength: '100mcg', dosageForm: 'Inhalation',
    packSize: '1 piece', unitsPerPack: 1, unitOfMeasure: 'piece',
    costPrice: 320, mrp: 450, salePrice: 425, taxRate: 0,
    lowStockThreshold: 5, reorderLevel: 10, reorderQuantity: 20,
    rackLocation: 'Shelf C2, Row 1', storageCondition: 'Room Temperature',
  },
];

// Build a workbook from the template definition + sample rows and trigger a download.
// `format` is 'xlsx' or 'csv'.
export async function downloadTemplate(format = 'xlsx') {
  const XLSX = await loadXLSX();
  const headers = TEMPLATE_COLUMNS.map((c) => c.label);
  const aoa = [
    headers,
    ...SAMPLE_ROWS.map((row) =>
      TEMPLATE_COLUMNS.map((c) => (row[c.key] !== undefined ? row[c.key] : ''))
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Column widths for readability
  ws['!cols'] = TEMPLATE_COLUMNS.map((c) => ({ wch: Math.max(14, c.label.length + 2) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Medicines');

  if (format === 'csv') {
    XLSX.writeFile(wb, 'medicine-import-template.csv', { bookType: 'csv' });
  } else {
    XLSX.writeFile(wb, 'medicine-import-template.xlsx', { bookType: 'xlsx' });
  }
}

// Reverse map: friendly column label → backend key
const LABEL_TO_KEY = TEMPLATE_COLUMNS.reduce((acc, c) => {
  acc[c.label.trim().toLowerCase()] = c.key;
  // also accept the raw key in case people edit the template
  acc[c.key.toLowerCase()] = c.key;
  return acc;
}, {});

const NUMBER_KEYS = new Set([
  'unitsPerPack', 'costPrice', 'mrp', 'salePrice', 'wholesalePrice',
  'taxRate', 'lowStockThreshold', 'reorderLevel', 'reorderQuantity',
]);

// Parse a File (csv/xlsx/xls) into an array of medicine objects ready to POST.
// Returns: { rows: [{ ...keyed by backend field }], errors: [{ row, error }] }
export async function parseImportFile(file) {
  const XLSX = await loadXLSX();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { rows: [], errors: [{ row: 0, error: 'No sheet found in file' }] };

  // defval: '' so blank cells become empty strings (not undefined)
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });

  const rows = [];
  const errors = [];

  raw.forEach((rec, i) => {
    const out = {};
    for (const [label, value] of Object.entries(rec)) {
      const key = LABEL_TO_KEY[String(label).trim().toLowerCase()];
      if (!key) continue; // ignore unknown columns
      let v = value;
      if (typeof v === 'string') v = v.trim();
      if (v === '' || v === null) continue;
      if (NUMBER_KEYS.has(key)) {
        const n = Number(v);
        if (Number.isFinite(n)) out[key] = n;
      } else {
        out[key] = v;
      }
    }
    // Validate the bare minimum so the user sees obvious errors before posting
    if (!out.medicineName) {
      errors.push({ row: i + 2, error: 'Missing Medicine Name' });
      return;
    }
    rows.push(out);
  });

  return { rows, errors };
}
