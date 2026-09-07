'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';

type Change = { id: string; kind: 'created' | 'updated'; at: number };
let latestChange: Change | null = null;
export function announceTableChange(id: string, kind: Change['kind']) {
  latestChange = { id, kind, at: Date.now() };
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('table-record-saved'));
}

export function TableRow({ id, index, children, exiting = false }: { id: string; index: number; children: ReactNode; exiting?: boolean }) {
  const [change, setChange] = useState<Change | null>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      const pending = latestChange;
      if (pending?.id === id && Date.now() - pending.at < 2000) {
        setChange(pending);
        setEntered(true);
        timer = setTimeout(() => setChange(null), 1400);
      }
    };
    update(); window.addEventListener('table-record-saved', update);
    return () => { clearTimeout(timer); window.removeEventListener('table-record-saved', update); };
  }, [id]);
  return <tr onAnimationEnd={() => setEntered(true)} className={`fluid-row ${exiting ? 'row-exit' : change ? `row-${change.kind}` : !entered && index < 6 ? 'row-enter' : ''}`} style={{ animationDelay: exiting || change ? '0ms' : `${Math.min(index, 5) * 25}ms` }} aria-disabled={exiting || undefined}>{children}</tr>;
}

export function TableAction({ label, danger = false, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: ReactNode }) {
  const tooltipId = useId();
  const [dismissed, setDismissed] = useState(false);
  return <span className={`table-action ${dismissed ? 'tooltip-dismissed' : ''}`} onMouseEnter={() => setDismissed(false)}>
    <button type="button" className={danger ? 'danger' : ''} aria-label={label} aria-describedby={tooltipId} onFocus={() => setDismissed(false)} onKeyDown={e => { if (e.key === 'Escape') setDismissed(true); }} onClick={onClick}>{children}</button>
    <span id={tooltipId} role="tooltip" className="table-tooltip">{label}</span>
  </span>;
}

export function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return <>{Array.from({ length: rows }, (_, row) => <tr key={row} className="table-skeleton" aria-hidden="true">{Array.from({ length: columns }, (_, col) => <td key={col}><span className="skeleton-line"/><span className="skeleton-line short"/></td>)}</tr>)}</>;
}

export function TableEmpty({ columns, message }: { columns: number; message: string }) {
  return <tr><td colSpan={columns}><div className="empty-state" role="status"><strong>Sin resultados</strong><span>{message}</span></div></td></tr>;
}

/** Optional controls for tables that already support ordering and pagination. */
export function SortableHeader({ label, direction, onSort }: { label: string; direction?: 'ascending' | 'descending'; onSort: () => void }) {
  return <th scope="col" aria-sort={direction ?? 'none'}><button className="table-sort" onClick={onSort}>{label}<span aria-hidden="true" className={direction === 'descending' ? 'sort-desc' : ''}>↑</span></button></th>;
}
export function TablePagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  const visible = Array.from({ length: pages }, (_, i) => i + 1).filter(i => i === 1 || i === pages || Math.abs(i - page) <= 1);
  return <nav className="table-pagination" aria-label="Paginación de tabla"><button disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</button>{visible.map((i, index) => <span key={i}>{index > 0 && i - visible[index - 1] > 1 && <span aria-hidden="true">…</span>}<button aria-label={`Página ${i}`} aria-current={i === page ? 'page' : undefined} onClick={() => onChange(i)}>{i}</button></span>)}<button disabled={page >= pages} onClick={() => onChange(page + 1)}>Siguiente</button></nav>;
}
