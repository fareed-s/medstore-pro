import { useState, useEffect } from 'react';
import API from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import { HiOutlineSearch, HiOutlinePrinter, HiOutlineTrash } from 'react-icons/hi';

const LABEL_SIZES = [
  { key: 'small', label: 'Small (38x25mm)', w: 144, h: 94 },
  { key: 'medium', label: 'Medium (50x30mm)', w: 189, h: 113 },
  { key: 'large', label: 'Large (70x40mm)', w: 264, h: 151 },
];

export default function BarcodeLabelPage() {
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState([]);
  const [labels, setLabels] = useState([]);
  const [labelSize, setLabelSize] = useState('medium');
  const [showPrice, setShowPrice] = useState(true);
  const [showExpiry, setShowExpiry] = useState(true);
  const [copies, setCopies] = useState(1);

  useEffect(() => {
    if (searchQ.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try { const { data } = await API.get(`/medicines/search?q=${searchQ}&limit=8`); setResults(data.data); } catch(err) { toast.error(err.response?.data?.message || "Operation failed"); }
    }, 200);
    return () => clearTimeout(t);
  }, [searchQ]);

  const addLabel = (med) => {
    if (labels.find(l => l._id === med._id)) return;
    setLabels([...labels, { ...med, copies: copies }]);
    setSearchQ(''); setResults([]);
  };

  const removeLabel = (id) => setLabels(labels.filter(l => l._id !== id));
  const updateCopies = (id, c) => setLabels(labels.map(l => l._id === id ? { ...l, copies: parseInt(c) || 1 } : l));

  const printLabels = () => {
    const size = LABEL_SIZES.find(s => s.key === labelSize);
    const win = window.open('', '_blank', 'width=600,height=800');
    let html = `<!DOCTYPE html><html><head><style>
      @page { size: ${size.w}px ${size.h}px; margin: 0; }
      body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
      .label { width: ${size.w}px; height: ${size.h}px; padding: 4px 6px; box-sizing: border-box; page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
      .name { font-size: ${labelSize === 'small' ? '8' : '10'}px; font-weight: bold; line-height: 1.2; margin-bottom: 2px; overflow: hidden; max-height: ${labelSize === 'small' ? '16' : '24'}px; }
      .barcode { font-family: 'Libre Barcode 128', 'Free 3 of 9', monospace; font-size: ${labelSize === 'small' ? '24' : '32'}px; line-height: 1; }
      .barcode-num { font-size: 7px; letter-spacing: 1px; }
      .price { font-size: ${labelSize === 'small' ? '9' : '12'}px; font-weight: bold; margin-top: 1px; }
      .expiry { font-size: 7px; color: #666; }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&display=swap" rel="stylesheet">
    </head><body>`;

    for (const label of labels) {
      for (let i = 0; i < label.copies; i++) {
        html += `<div class="label">
          <div class="name">${label.medicineName}</div>
          <div class="barcode">${label.barcode || '0000000000000'}</div>
          <div class="barcode-num">${label.barcode || ''}</div>
          ${showPrice ? `<div class="price">${formatCurrency(label.salePrice)}</div>` : ''}
          ${showExpiry ? `<div class="expiry">MRP: ${formatCurrency(label.mrp)}</div>` : ''}
        </div>`;
      }
    }
    html += '</body></html>';
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-1">Barcode Label Printer</h1>
      <p className="text-gray-500 text-sm mb-6">Generate and print barcode labels for medicines</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-heading font-semibold text-gray-900 mb-3">Label Settings</h3>
            <div className="space-y-3">
              <div><label className="label">Label Size</label>
                <select className="input-field" value={labelSize} onChange={(e) => setLabelSize(e.target.value)}>
                  {LABEL_SIZES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div><label className="label">Default Copies</label>
                <input type="number" min="1" max="100" className="input-field" value={copies} onChange={(e) => setCopies(parseInt(e.target.value) || 1)} />
              </div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" /><label className="text-sm">Show price</label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={showExpiry} onChange={(e) => setShowExpiry(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" /><label className="text-sm">Show MRP</label></div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-heading font-semibold text-gray-900 mb-3">Add Medicines</h3>
            <div className="relative">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="input-field pl-9" placeholder="Search medicine..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
              {results.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border max-h-48 overflow-y-auto">
                  {results.map(m => (
                    <button key={m._id} onClick={() => addLabel(m)} className="w-full px-3 py-2 text-left hover:bg-primary-50 text-sm border-b">
                      {m.medicineName} <span className="text-gray-400 text-xs">— {m.barcode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Labels Queue */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-gray-900">Labels Queue ({labels.length})</h3>
              {labels.length > 0 && <button onClick={printLabels} className="btn-primary flex items-center gap-1 text-sm"><HiOutlinePrinter className="w-4 h-4" /> Print All</button>}
            </div>
            {labels.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">Search and add medicines to generate labels</p>
            ) : (
              <div className="space-y-2">
                {labels.map(l => (
                  <div key={l._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-200">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{l.medicineName}</p>
                      <p className="text-xs text-gray-400 font-mono">{l.barcode}</p>
                    </div>
                    <div className="text-right text-sm font-bold text-primary-600">{formatCurrency(l.salePrice)}</div>
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-gray-500">×</label>
                      <input type="number" min="1" max="100" value={l.copies} onChange={(e) => updateCopies(l._id, e.target.value)}
                        className="w-14 text-center border rounded-lg py-1 text-sm" />
                    </div>
                    <button onClick={() => removeLabel(l._id)} className="p-1 hover:bg-red-50 rounded"><HiOutlineTrash className="w-4 h-4 text-red-400" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
