import { useRef, useState } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { apiError } from '../../utils/helpers';
import {
  HiOutlineUpload, HiOutlineDownload, HiOutlineDocumentText,
  HiOutlineCheck, HiOutlineExclamation, HiOutlineTrash,
} from 'react-icons/hi';
import {
  TEMPLATE_COLUMNS,
  downloadTemplate,
  parseImportFile,
} from '../../features/medicines/bulkImportTemplate';

export default function MasterCatalogPage() {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);

  const handlePick = async (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setRows([]);
    setParseErrors([]);
    setParsing(true);
    try {
      const { rows: parsed, errors } = await parseImportFile(f);
      setRows(parsed);
      setParseErrors(errors);
      if (parsed.length === 0) toast.error('No valid rows found in this file');
      else toast.success(`Parsed ${parsed.length} medicines from file`);
    } catch (err) {
      toast.error(err?.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const handleUpload = async () => {
    if (!rows.length) {
      toast.error('Pick a file first');
      return;
    }
    setUploading(true);
    try {
      // Chunk the rows so any single request stays well under Express's body
      // limit and the user sees progress instead of a frozen UI on big files.
      const CHUNK_SIZE = 1000;
      const chunks = [];
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        chunks.push(rows.slice(i, i + CHUNK_SIZE));
      }
      setProgress({ done: 0, total: chunks.length });

      let masterInserted = 0;
      let masterErrors = 0;
      let masterTotal = 0;
      let totalSyncedToStores = 0;
      let catalogStores = 0;
      let serverNote = null;
      const errorSamples = [];
      // storeId → aggregated { storeName, inserted, skipped }
      const merged = new Map();

      for (let i = 0; i < chunks.length; i++) {
        const { data } = await API.post('/superadmin/medicines/bulk-master', { medicines: chunks[i] });
        masterInserted += data.masterInserted || 0;
        masterErrors   += data.masterErrors   || 0;
        masterTotal    = data.masterTotal ?? masterTotal;
        totalSyncedToStores += data.totalSyncedToStores || 0;
        catalogStores = data.catalogStores ?? catalogStores;
        if (data.note) serverNote = data.note;
        if (data.masterErrorSamples?.length && errorSamples.length < 20) {
          for (const e of data.masterErrorSamples) {
            if (errorSamples.length >= 20) break;
            errorSamples.push(e);
          }
        }
        for (const s of data.summary || []) {
          const key = String(s.storeId);
          const prev = merged.get(key) || { storeId: s.storeId, storeName: s.storeName, inserted: 0, skipped: 0 };
          prev.inserted += s.inserted;
          prev.skipped += s.skipped;
          merged.set(key, prev);
        }
        setProgress({ done: i + 1, total: chunks.length });
      }

      const aggregated = {
        masterInserted,
        masterErrors,
        masterTotal,
        catalogStores,
        totalSyncedToStores,
        total: rows.length,
        summary: Array.from(merged.values()),
        note: serverNote,
        errorSamples,
      };
      setResult(aggregated);

      if (masterInserted === 0 && totalSyncedToStores === 0) {
        toast.warning(`0 new — saari medicines master catalog me already mojood hain`);
      } else {
        toast.success(`Master +${masterInserted} · synced to ${catalogStores} store(s)`);
      }
    } catch (err) {
      toast.error(apiError(err, 'Upload failed'));
    } finally {
      setUploading(false);
      setProgress({ done: 0, total: 0 });
    }
  };

  const reset = () => {
    setFile(null);
    setRows([]);
    setParseErrors([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Master Catalog</h1>
        <p className="text-gray-500 text-sm">
          Yeh upload central <b>master catalog</b> me save hota hai. Sirf un stores ko medicines automatically milti hain
          jin ke pass <b>Catalog access ON</b> ho (All Stores page se grant karo). Naye stores ko create karte waqt bhi ek
          checkbox se grant kar sakte ho.
        </p>
      </div>

      {/* Step 1: download template */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900">1. Download the template</p>
            <p className="text-sm text-gray-500">
              {TEMPLATE_COLUMNS.length} columns. Required:{' '}
              <span className="font-mono text-xs">
                {TEMPLATE_COLUMNS.filter(c => c.required).map(c => c.label).join(', ')}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => downloadTemplate('xlsx')} className="btn-secondary flex items-center gap-1.5">
              <HiOutlineDownload className="w-4 h-4" /> XLSX
            </button>
            <button onClick={() => downloadTemplate('csv')} className="btn-secondary flex items-center gap-1.5">
              <HiOutlineDownload className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Step 2: pick file */}
      <div className="card mb-4">
        <p className="font-semibold text-gray-900 mb-2">2. Upload your filled file</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => handlePick(e.target.files?.[0])}
            className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700 file:font-medium hover:file:bg-primary-100"
          />
          {file && (
            <button onClick={reset} className="btn-ghost p-2 text-red-500" title="Clear">
              <HiOutlineTrash className="w-4 h-4" />
            </button>
          )}
        </div>
        {parsing && <p className="mt-2 text-sm text-primary-600">Parsing…</p>}
      </div>

      {/* Parsed preview */}
      {rows.length > 0 && !result && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <p className="font-semibold text-gray-900">
              <HiOutlineDocumentText className="inline w-4 h-4 mr-1 -mt-0.5" />
              Preview — {rows.length} medicine{rows.length === 1 ? '' : 's'} ready
            </p>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-primary flex items-center gap-1.5">
              <HiOutlineUpload className="w-4 h-4" />
              {uploading
                ? (progress.total > 0
                    ? `Uploading… ${progress.done} / ${progress.total} chunks`
                    : 'Uploading…')
                : 'Push to all stores'}
            </button>
          </div>

          {uploading && progress.total > 0 && (
            <div className="mb-3">
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Pushing in chunks of 1000 — please don't close this tab.
              </p>
            </div>
          )}

          {parseErrors.length > 0 && (
            <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              <p className="font-semibold mb-1">{parseErrors.length} row(s) skipped during parsing:</p>
              <ul className="list-disc list-inside max-h-24 overflow-y-auto">
                {parseErrors.slice(0, 8).map((e, i) => (
                  <li key={i}>Row {e.row}: {e.error}</li>
                ))}
                {parseErrors.length > 8 && <li>…and {parseErrors.length - 8} more</li>}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Generic</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                  <th className="px-3 py-2 text-right">Sale</th>
                  <th className="px-3 py-2 text-right">MRP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium text-gray-900">{r.medicineName}</td>
                    <td className="px-3 py-2 text-gray-500">{r.genericName || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{r.category || '—'}</td>
                    <td className="px-3 py-2 text-right">{r.costPrice ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{r.salePrice ?? '—'}</td>
                    <td className="px-3 py-2 text-right">{r.mrp ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 50 && (
              <p className="text-xs text-gray-400 text-center py-2">
                Showing first 50 of {rows.length} — full list will upload.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card">
          {/* Top summary tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <ResultTile label="Master +"           value={result.masterInserted}      tone="green" />
            <ResultTile label="Master total now"   value={result.masterTotal}         tone="primary" />
            <ResultTile label="Catalog stores"     value={result.catalogStores}       tone="primary" />
            <ResultTile label="Synced to stores"   value={result.totalSyncedToStores} tone="green" />
          </div>

          {result.masterErrors > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800 mb-3">
              <p className="font-semibold mb-1 flex items-center gap-1.5">
                <HiOutlineExclamation className="w-4 h-4" />
                {result.masterErrors} row(s) failed validation
              </p>
              {result.errorSamples?.length > 0 && (
                <ul className="list-disc list-inside text-xs max-h-40 overflow-y-auto">
                  {result.errorSamples.slice(0, 10).map((e, i) => (
                    <li key={i}><b>{e.name || '(no name)'}</b> — {e.error}</li>
                  ))}
                  {result.errorSamples.length > 10 && (
                    <li className="list-none italic mt-1">…and {result.errorSamples.length - 10} more</li>
                  )}
                </ul>
              )}
              <p className="text-[11px] mt-1 italic">
                Tip: most failures are unknown enum values (category, schedule, dosageForm). Re-upload se ye automatically default value pe map ho jayegi ab.
              </p>
            </div>
          )}

          {result.note && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800 mb-3 flex items-start gap-2">
              <HiOutlineExclamation className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{result.note}</span>
            </div>
          )}

          {result.summary.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-gray-100 mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-3 py-2 text-left">Catalog-enabled Store</th>
                    <th className="px-3 py-2 text-right">Inserted</th>
                    <th className="px-3 py-2 text-right">Skipped (already had)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {result.summary.map(s => (
                    <tr key={s.storeId}>
                      <td className="px-3 py-2 font-medium">{s.storeName}</td>
                      <td className="px-3 py-2 text-right text-green-600 font-semibold">{s.inserted}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{s.skipped}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-3 text-sm text-gray-600 mb-4 text-center">
              Master catalog updated, but no store has catalog access yet. Open <b>All Stores</b> →
              click <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-white border">Catalog OFF</span> on a row to grant access and auto-sync.
            </div>
          )}
          <button onClick={reset} className="btn-secondary w-full">Upload another file</button>
        </div>
      )}

      {/* Empty state */}
      {!file && !result && (
        <div className="card text-center py-10 text-gray-400">
          <HiOutlineExclamation className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No file selected yet — download the template, fill it in, then upload.</p>
        </div>
      )}
    </div>
  );
}

function ResultTile({ label, value, tone = 'gray' }) {
  const cls = {
    green:   'bg-green-50 text-green-700 border-green-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    primary: 'bg-primary-50 text-primary-700 border-primary-200',
    gray:    'bg-gray-50 text-gray-600 border-gray-200',
  }[tone] || 'bg-gray-50 text-gray-600 border-gray-200';
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${cls}`}>
      <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-xl font-heading font-bold leading-tight">{value ?? 0}</p>
    </div>
  );
}
