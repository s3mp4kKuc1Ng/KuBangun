import { useEffect, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { X, Inbox } from 'lucide-react';
import { cx } from '@/lib/format';

export const inputCls = 'w-full bg-card border border-input px-3 py-2 text-sm rounded-sm focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-accent placeholder:text-muted-foreground/70';
type BP = ButtonHTMLAttributes<HTMLButtonElement> & { v?: 'primary' | 'accent' | 'ghost' | 'danger' | 'outline'; sm?: boolean };
export function Btn({ v = 'outline', sm, className, ...p }: BP) {
  const m = { primary: 'bg-primary text-primary-foreground hover:bg-primary/90', accent: 'bg-accent text-accent-foreground hover:brightness-95 font-semibold', ghost: 'hover:bg-muted', danger: 'bg-destructive text-destructive-foreground hover:brightness-110', outline: 'border border-input bg-card hover:bg-muted' }[v];
  return <button type="button" {...p} className={cx('inline-flex items-center justify-center gap-2 rounded-sm font-medium transition-all active:translate-y-px disabled:opacity-50 disabled:pointer-events-none', sm ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm', m, className)} />;
}
export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return <label className={cx('block', className)}><span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</span>{children}{hint && <span className="block text-xs text-muted-foreground mt-1">{hint}</span>}</label>;
}
export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'accent' | 'ink' | 'warn' | 'ok' | 'bad' }) {
  const m = { muted: 'bg-muted text-muted-foreground', accent: 'bg-accent/20 text-[hsl(22,80%,30%)]', ink: 'bg-primary text-primary-foreground', warn: 'bg-[hsl(45,85%,82%)] text-[hsl(38,70%,22%)]', ok: 'bg-[hsl(160,30%,84%)] text-[hsl(160,40%,20%)]', bad: 'bg-[hsl(8,60%,88%)] text-[hsl(8,68%,30%)]' }[tone];
  return <span className={cx('inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-sm font-mono uppercase tracking-wide', m)}>{children}</span>;
}
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto no-print" role="dialog" aria-modal="true" aria-label={title}>
    <div className="fixed inset-0 bg-[hsl(215,45%,10%)]/60" onClick={onClose} />
    <div className={cx('relative rise bg-card border border-border shadow-2xl mt-10 w-full', wide ? 'max-w-2xl' : 'max-w-md')}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/60"><h3 className="font-display font-bold text-lg">{title}</h3><button onClick={onClose} aria-label="Tutup" className="p-1 hover:bg-muted"><X size={18} /></button></div>
      <div className="p-5">{children}</div></div></div>;
}
export function Confirm({ title, body, label, onOk, onClose }: { title: string; body: ReactNode; label: string; onOk: () => void; onClose: () => void }) {
  return <Modal title={title} onClose={onClose}><div className="text-sm space-y-4"><div>{body}</div><div className="flex justify-end gap-2"><Btn onClick={onClose}>Batal</Btn><Btn v="danger" onClick={() => { onOk(); onClose(); }} data-testid="button-confirm">{label}</Btn></div></div></Modal>;
}
export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="border border-dashed border-input bg-card/60 blueprint px-6 py-10 text-center rise"><Inbox className="mx-auto mb-3 text-muted-foreground" /><p className="font-display font-bold text-lg">{title}</p><p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">{body}</p>{action}</div>;
}
export function PageHead({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-3 mb-6 rise"><div><p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-foreground/70 mb-1"><span className="inline-block w-6 h-[3px] bg-accent align-middle mr-2" />{kicker}</p><h1 className="font-display text-3xl md:text-4xl font-extrabold">{title}</h1></div><div className="flex gap-2 flex-wrap no-print">{children}</div></div>;
}
export function Skeleton() { return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skel h-20" />)}</div>; }
