import { memo, useCallback } from 'react';

function Pagination({ page, pages, total, onPage }) {
  const prev = useCallback(() => onPage(Math.max(1, page - 1)), [onPage, page]);
  const next = useCallback(() => onPage(Math.min(pages, page + 1)), [onPage, page, pages]);

  if (!pages || pages < 2) return null;

  const buttons = [];
  for (let i = 0; i < Math.min(pages, 5); i++) {
    const p = page <= 3 ? i + 1 : page - 2 + i;
    if (p < 1 || p > pages) continue;
    buttons.push(p);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-500">
        Page {page} of {pages}{typeof total === 'number' ? ` (${total} items)` : ''}
      </p>
      <div className="flex gap-1">
        <button onClick={prev} disabled={page <= 1} className="btn-ghost text-xs px-3 py-1 disabled:opacity-30">Prev</button>
        {buttons.map((p) => (
          <button key={p} onClick={() => onPage(p)}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${p === page ? 'bg-primary-600 text-white' : 'btn-ghost'}`}>
            {p}
          </button>
        ))}
        <button onClick={next} disabled={page >= pages} className="btn-ghost text-xs px-3 py-1 disabled:opacity-30">Next</button>
      </div>
    </div>
  );
}

export default memo(Pagination);
