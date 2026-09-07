'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AnimatedValue({ value }: { value: string }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const match = value.match(/-?[\d,]+(?:\.\d+)?/);
    if (!match || preference.matches) { setDisplay(value); return; }
    const target = Number(match[0].replaceAll(',', ''));
    const digits = match[0].split('.')[1]?.length ?? 0;
    const formatter = new Intl.NumberFormat('es-HN', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 550, 1);
      setDisplay(progress === 1 ? value : value.replace(match[0], formatter.format(target * (1 - Math.pow(1 - progress, 3)))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    const stop = () => { cancelAnimationFrame(frame); setDisplay(value); };
    frame = requestAnimationFrame(tick);
    preference.addEventListener('change', stop);
    return () => { cancelAnimationFrame(frame); preference.removeEventListener('change', stop); };
  }, [value]);
  return <strong className="animated-value" aria-label={value}><span aria-hidden="true">{display}</span></strong>;
}

export function RefreshButton({ refresh }: { refresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  return <Button variant="ghost" size="icon" title="Actualizar datos" aria-label={busy ? 'Actualizando datos' : 'Actualizar datos'} aria-busy={busy} disabled={busy} onClick={async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await Promise.allSettled([refresh(), new Promise(resolve => setTimeout(resolve, 500))]); }
    finally { lock.current = false; setBusy(false); }
  }}><RefreshCw className={busy ? 'refresh-motion' : ''}/></Button>;
}

export function NotificationBell({ count = 0 }: { count?: number }) {
  const previous = useRef(0);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (count > previous.current) setPulse(true);
    previous.current = count;
  }, [count]);
  return <Button variant="ghost" size="icon" className="notification-button" aria-label={`Notificaciones: ${count} nuevas`}><Bell className={pulse ? 'bell-motion' : ''} onAnimationEnd={() => setPulse(false)}/><i>{count}</i></Button>;
}

export function MobileDrawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const [present, setPresent] = useState(open);
  useEffect(() => {
    if (open) { setPresent(true); return; }
    const timer = setTimeout(() => setPresent(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280);
    return () => clearTimeout(timer);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, onClose]);
  if (!present && !open) return null;
  return <div className={`drawer-layer ${open ? 'drawer-enter' : 'drawer-exit'}`} inert={!open}><button className="drawer-backdrop" aria-label="Cerrar menú" onClick={onClose}/><aside className="mobile-drawer">{children}</aside></div>;
}
