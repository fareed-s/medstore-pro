/**
 * Convert array of objects to CSV and trigger download
 */
export function exportToCSV(data, filename = 'report') {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]).filter(k => k !== '_id');
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(h => {
      let val = row[h];
      if (val === null || val === undefined) val = '';
      if (typeof val === 'object') val = val.name || val.id || JSON.stringify(val);
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val}"`;
      return val;
    });
    csvRows.push(values.join(','));
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Print current page content
 */
export function printReport(title) {
  const content = document.querySelector('.card') || document.querySelector('main');
  if (!content) return window.print();

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;}th{background:#f5f5f5;font-weight:bold;}h1{font-size:18px;margin-bottom:10px;}.badge{padding:2px 6px;border-radius:4px;font-size:10px;}</style>
  </head><body><h1>${title}</h1>${content.innerHTML}</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); win.close(); }, 500);
}
