import { memo, useCallback, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import {
  HiOutlineX, HiOutlineDownload, HiOutlineUpload, HiOutlineDocumentText,
  HiOutlineCheck, HiOutlineExclamation,
} from 'react-icons/hi';
import API from '../../../utils/api';
import { apiError } from '../../../utils/helpers';
import { TEMPLATE_COLUMNS, downloadTemplate, parseImportFile } from '../bulkImportTemplate';
import { fetchMedicines } from '../medicinesSlice';

function BulkImportModal({ onClose }) {
  const dispatch = useDispatch();
  const inputRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [rows, setRows]         = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null); // { imported, errors, total }

  const onPick = useCallback(() => inputRef.current?.click(), []);

  const onFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    try {
      const { rows: r, errors } = await parseImportFile(file);
      setRows(r);
      setParseErrors(errors);
      if (!r.length && errors.length) {
        toast.error('No valid rows found — check the template');
      } else if (errors.length) {
        toast.warning(`${r.length} rows parsed, ${errors.length} skipped`);
      } else {
        toast.success(`${r.length} rows ready to import`);
      }
    } catch (err) {
      toast.error('Failed to read file: ' + (err.message || 'unknown error'));
    }
    // reset input so the same file can be re-selected
    e.target.value = '';
  }, []);

  const onImport = useCallback(async () => {
    if (!rows.length) return;
    setImporting(true);
    setProgress({ done: 0, total: rows.length });
    try {
      // Backend uses insertMany under the hood, so we can push much bigger
      // chunks per request. 1000 = ~40 round-trips for a 39k file instead of 195.
      const CHUNK = 1000;
      let imported = 0;
      const allErrors = [];
      for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);
        const { data } = await API.post('/medicines/bulk-import', { medicines: slice });
        imported += data.imported || 0;
        if (data.errors?.length) {
          for (const e of data.errors) {
            allErrors.push({ ...e, row: (e.row || 0) + i });
          }
        }
        setProgress({ done: Math.min(i + CHUNK, rows.length), total: rows.length });
      }
      const total = rows.length;
      setResult({ imported, errors: allErrors, total });
      if (imported > 0) toast.success(`Imported ${imported} of ${total} medicines`);
      if (allErrors.length) toast.warning(`${allErrors.length} rows failed`);
      // Refresh the list in the background
      dispatch(fetchMedicines());
    } catch (err) {
      toast.error(apiError(err, 'Import failed'));
    } finally {
      setImporting(false);
    }
  }, [rows, dispatch]);

  const onDownloadXLSX = useCallback(() => downloadTemplate('xlsx'), []);
  const onDownloadCSV  = useCallback(() => downloadTemplate('csv'),  []);

  const handleClose = useCallback(() => { if (!importing) onClose(); }, [importing, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={handleClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-lg">Bulk Import Medicines</h3>
            <p className="text-xs text-gray-500">Upload a CSV or Excel file. Download the template to see the required columns.</p>
          </div>
          <button onClick={handleClose} disabled={importing} className="btn-ghost p-2">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: download template */}
          <Section number="1" title="Download the template">
            <p className="text-sm text-gray-600 mb-3">
              Open the template, fill in your medicines (one per row), then save and upload it back.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={onDownloadXLSX} className="btn-secondary flex items-center gap-2 text-sm">
                <HiOutlineDownload className="w-4 h-4" /> Excel template (.xlsx)
              </button>
              <button onClick={onDownloadCSV} className="btn-secondary flex items-center gap-2 text-sm">
                <HiOutlineDownload className="w-4 h-4" /> CSV template (.csv)
              </button>
            </div>
            <details className="mt-4">
              <summary className="text-xs font-medium text-primary-600 cursor-pointer hover:underline">
                View column reference
              </summary>
              <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="px-3 py-2">Column</th>
                      <th className="px-3 py-2">Required</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {TEMPLATE_COLUMNS.map((c) => (
                      <tr key={c.key}>
                        <td className="px-3 py-1.5 font-medium">{c.label}</td>
                        <td className="px-3 py-1.5">
                          {c.required
                            ? <span className="badge badge-red text-[10px]">Yes</span>
                            : <span className="text-gray-400">No</span>}
                        </td>
                        <td className="px-3 py-1.5 text-gray-500">{c.hint || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Section>

          {/* Step 2: pick file */}
          <Section number="2" title="Upload your filled file">
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls"
              className="hidden" onChange={onFile} />
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={onPick} className="btn-primary flex items-center gap-2">
                <HiOutlineUpload className="w-4 h-4" /> Choose file
              </button>
              {fileName && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <HiOutlineDocumentText className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{fileName}</span>
                </div>
              )}
            </div>

            {(rows.length > 0 || parseErrors.length > 0) && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Rows ready"   value={rows.length}        accent="text-primary-700" />
                <Stat label="Skipped rows" value={parseErrors.length} accent={parseErrors.length ? 'text-red-600' : 'text-gray-700'} />
              </div>
            )}

            {parseErrors.length > 0 && (
              <div className="mt-3 max-h-32 overflow-y-auto rounded-lg border border-red-100 bg-red-50/40 p-2 text-xs text-red-700">
                {parseErrors.slice(0, 20).map((e, i) => (
                  <div key={i}>Row {e.row}: {e.error}</div>
                ))}
                {parseErrors.length > 20 && <div className="text-red-500 mt-1">…and {parseErrors.length - 20} more</div>}
              </div>
            )}
          </Section>

          {/* Step 3: preview */}
          {rows.length > 0 && !result && (
            <Section number="3" title={`Preview (first 10 of ${rows.length})`}>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Medicine</th>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-left">Generic</th>
                        <th className="px-3 py-2 text-right">MRP</th>
                        <th className="px-3 py-2 text-right">Sale</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.slice(0, 10).map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-1.5 font-medium">{r.medicineName}</td>
                          <td className="px-3 py-1.5">{r.category || '—'}</td>
                          <td className="px-3 py-1.5 text-gray-500">{r.genericName || '—'}</td>
                          <td className="px-3 py-1.5 text-right">{r.mrp ?? '—'}</td>
                          <td className="px-3 py-1.5 text-right">{r.salePrice ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>
          )}

          {/* Progress while uploading */}
          {importing && progress.total > 0 && (
            <div className="rounded-xl border border-primary-100 bg-primary-50/40 p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-primary-800">
                  Importing {progress.done.toLocaleString()} / {progress.total.toLocaleString()}…
                </span>
                <span className="font-bold text-primary-700">
                  {Math.round((progress.done / progress.total) * 100)}%
                </span>
              </div>
              <div className="h-2 bg-primary-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary-600 transition-all"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
              </div>
              <p className="text-[11px] text-primary-700/70 mt-2">
                Don't close this window — large files can take a minute or two.
              </p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <HiOutlineCheck className="w-5 h-5 text-green-600" />
                <span className="font-semibold">
                  {result.imported} of {result.total} medicines imported
                </span>
              </div>
              {result.errors?.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="flex items-center gap-1 text-amber-700 font-medium mb-1">
                    <HiOutlineExclamation className="w-4 h-4" />
                    {result.errors.length} rows failed:
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-amber-100 bg-amber-50/50 p-2 text-amber-800">
                    {result.errors.slice(0, 30).map((e, i) => (
                      <div key={i}>Row {e.row}: <span className="font-medium">{e.medicine}</span> — {e.error}</div>
                    ))}
                    {result.errors.length > 30 && <div className="mt-1">…and {result.errors.length - 30} more</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={handleClose} disabled={importing} className="btn-secondary">
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button onClick={onImport} disabled={!rows.length || importing} className="btn-primary">
              {importing ? 'Importing…' : `Import ${rows.length || ''} medicines`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const Section = memo(function Section({ number, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">{number}</span>
        <h4 className="font-heading font-semibold text-gray-900">{title}</h4>
      </div>
      <div className="ml-8">{children}</div>
    </div>
  );
});

const Stat = memo(function Stat({ label, value, accent }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <p className="text-[11px] text-gray-500 uppercase">{label}</p>
      <p className={`text-xl font-heading font-bold ${accent}`}>{value}</p>
    </div>
  );
});

export default memo(BulkImportModal);
