import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { LayoutDashboard, FolderKanban, FileText, Settings, HardDrive, AlertTriangle, X, Menu, Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cx } from '@/lib/format';
import { Btn } from './kit';

const NAV = [
  { href: '/', label: 'Beranda', icon: LayoutDashboard },
  { href: '/projects', label: 'Proyek', icon: FolderKanban },
  { href: '/reports', label: 'Laporan', icon: FileText },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
];
export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const { saveError, loadError, clearError, retrySave, settings, storageConflict, exportDraft, reloadLatest } = useStore();
  const active = (h: string) => (h === '/' ? loc === '/' : loc.startsWith(h));
  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} onClick={() => setOpen(false)} data-testid={`link-nav-${n.label.toLowerCase()}`}
          className={cx('flex items-center gap-3 px-3 py-2 text-sm rounded-sm transition-colors border-l-4', active(n.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground border-accent' : 'border-transparent hover:bg-sidebar-accent/60')}>
          <n.icon size={17} />{n.label}
        </Link>
      ))}
    </nav>
  );
  const side = (
    <div className="flex flex-col h-full p-5 gap-6">
      <Link href="/" className="block" onClick={() => setOpen(false)}>
        <div className="flex items-center gap-2"><div className="w-8 h-8 bg-accent grid place-items-center text-accent-foreground font-display font-extrabold">K</div><span className="font-display text-2xl font-extrabold text-sidebar-accent-foreground">KuBangun</span></div>
        <p className="text-[11px] font-mono uppercase tracking-widest mt-1 opacity-70">Prototipe alur kerja</p>
      </Link>
      <Link href="/projects/new" onClick={() => setOpen(false)} data-testid="link-new-project" className="flex items-center justify-center gap-2 bg-accent text-accent-foreground font-semibold text-sm py-2.5 rounded-sm hover:brightness-95"><Plus size={16} />Buat Proyek</Link>
      {nav}
      <div className="mt-auto text-xs space-y-3">
        <div className="border border-sidebar-border p-3 rounded-sm leading-relaxed" data-testid="notice-local-only"><div className="flex items-center gap-2 font-semibold text-sidebar-accent-foreground mb-1"><HardDrive size={14} />Hanya di peramban ini</div>Data tersimpan di localStorage dan berkas di IndexedDB perangkat Anda. Tidak ada yang dikirim ke server. Menghapus data situs akan menghapus semuanya.</div>
        <div className="opacity-70 font-mono">Tampilan: {settings.role === 'pemilik' ? 'Pemilik rumah' : 'Profesional'}{settings.name && ` / ${settings.name}`}</div>
      </div>
    </div>
  );
  return (
    <div className="min-h-[100dvh] md:flex">
      <aside className="hidden md:block w-64 shrink-0 bg-sidebar text-sidebar-foreground sticky top-0 h-[100dvh] no-print">{side}</aside>
      <div className="md:hidden flex items-center justify-between bg-sidebar text-sidebar-foreground px-4 py-3 no-print">
        <span className="font-display text-xl font-extrabold text-sidebar-accent-foreground">KuBangun</span>
        <button aria-label="Menu" onClick={() => setOpen(true)} data-testid="button-menu"><Menu /></button>
      </div>
      {open && <div className="fixed inset-0 z-40 md:hidden no-print"><div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} /><div className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar text-sidebar-foreground rise overflow-y-auto"><button className="absolute right-3 top-3" onClick={() => setOpen(false)} aria-label="Tutup"><X /></button>{side}</div></div>}
      <main className="flex-1 min-w-0 p-4 md:p-8 max-w-[1200px]">
        {storageConflict && <div role="alert" data-testid="banner-storage-conflict" className="storage-conflict-notice mb-5 z-[60] mx-auto max-w-3xl max-h-[42dvh] overflow-y-auto border-2 border-destructive bg-card shadow-xl p-4 text-sm no-print">
          <b>Data proyek berubah di tab lain.</b>
          <p className="mt-1">Penulisan salinan lama diblokir agar baseline, progres, dan notifikasi terbaru tetap aman. Data tab ini tidak digabung otomatis.</p>
          <p className="mt-1 text-xs text-muted-foreground">Ekspor menyertakan salinan tab ini dan perubahan terakhir yang ditolak saat mencoba menyimpan. Isian formulir yang belum dicoba disimpan serta isi berkas bukti tidak termasuk.</p>
          <p className="mt-1 text-xs">Memuat ulang akan membuang draf dan isian formulir di tab ini. Ekspor terlebih dahulu bila diperlukan.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn sm onClick={exportDraft} data-testid="button-export-conflict-draft">Ekspor draf tab ini</Btn>
            <Btn sm v="primary" onClick={reloadLatest} data-testid="button-reload-latest">Muat ulang data terbaru</Btn>
          </div>
        </div>}
        {(saveError || loadError) && (
          <div role="alert" className="mb-5 border-l-4 border-destructive bg-[hsl(8,60%,92%)] p-4 text-sm flex gap-3 items-start no-print" data-testid="banner-save-error">
            <AlertTriangle className="text-destructive shrink-0" size={18} />
            <div className="flex-1"><b>Masalah penyimpanan lokal.</b> {saveError || loadError}</div>
            {saveError && !storageConflict && <Btn sm onClick={retrySave} data-testid="button-retry-save">Coba simpan lagi</Btn>}
            <button onClick={clearError} aria-label="Tutup"><X size={16} /></button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
