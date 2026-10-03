import { translate } from '@/lib/i18n/translate';
import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Search, Archive, ArchiveRestore, Trash2, ArrowUpRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { fmtDate, modeLabel, cx } from '@/lib/format';
import { gaps, readinessPct } from '@/lib/readiness';
import { Badge, Btn, Confirm, Empty, inputCls } from './kit';
import { useToast } from '@/hooks/use-toast';
import type { Project } from '@/lib/types';

export function ProjectList({ limit }: { limit?: number }) {
  const { projects, updateProject, deleteProject } = useStore();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [mode, setMode] = useState('all');
  const [status, setStatus] = useState('all');
  const [arch, setArch] = useState(false);
  const [del, setDel] = useState<Project | null>(null);
  const [arc, setArc] = useState<Project | null>(null);
  const list = useMemo(() => projects.filter((p) => p.archived === arch && (mode === 'all' || p.mode === mode) && (status === 'all' || p.status === status) && (`${p.name} ${p.city} ${p.province}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [projects, q, mode, status, arch]);
  const shown = limit ? list.slice(0, limit) : list;
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 no-print">
        <div className="relative flex-1 min-w-[200px]"><Search size={15} className="absolute left-3 top-3 text-muted-foreground" /><input data-testid="input-search" className={cx(inputCls, 'pl-9')} placeholder="Cari nama proyek, kota, provinsi" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select data-testid="select-mode" className={cx(inputCls, 'w-auto')} value={mode} onChange={(e) => setMode(e.target.value)}><option value="all">Semua jenis</option><option value="new">Bangun Baru</option><option value="renovation">Renovasi</option></select>
        <select data-testid="select-status" className={cx(inputCls, 'w-auto')} value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Semua status</option><option value="draft">Draf</option><option value="review-requested">Tinjauan diminta (simulasi)</option></select>
        <Btn data-testid="button-toggle-archive" onClick={() => setArch(!arch)}>{arch ? 'Lihat aktif' : 'Lihat arsip'}</Btn>
      </div>
      {shown.length === 0 ? (
        projects.length === 0 ? <Empty title="Belum ada proyek" body="Bangun Baru untuk mengorganisasi data rencana rumah; Renovasi untuk mencatat kondisi eksisting dan perubahan yang diusulkan." action={<Link href="/projects/new" className="inline-block bg-accent text-accent-foreground px-4 py-2 text-sm font-semibold rounded-sm">Buat Proyek</Link>} />
          : <Empty title={arch ? 'Arsip kosong' : 'Tidak ada proyek yang cocok'} body="Ubah kata kunci atau filter untuk melihat proyek lain." action={<Btn onClick={() => { setQ(''); setMode('all'); setStatus('all'); }}>Reset filter</Btn>} />
      ) : (
        <ul className="space-y-3">
          {shown.map((p, i) => {
            const pct = readinessPct(p);
            const g = gaps(p);
            return (
              <li key={p.id} style={{ animationDelay: `${i * 40}ms` }} className="rise group bg-card border border-card-border flex flex-col md:flex-row" data-testid={`card-project-${p.id}`}>
                <div className={cx('w-full md:w-2 h-2 md:h-auto', p.mode === 'new' ? 'bg-primary' : 'bg-accent')} />
                <div className="flex-1 p-4 min-w-0">
                  <div className="flex flex-wrap gap-2 items-center mb-1.5">
                    <Badge tone={p.mode === 'new' ? 'ink' : 'accent'}>{modeLabel(p.mode)}</Badge>
                    <Badge tone={p.status === 'draft' ? 'muted' : 'warn'}>{p.status === 'draft' ? 'Draf' : 'Tinjauan diminta (simulasi)'}</Badge>
                    {p.example && <Badge tone="warn">Contoh fiktif</Badge>}
                    {p.archived && <Badge>Arsip</Badge>}
                  </div>
                  <Link href={`/projects/${p.id}`} className="font-display text-xl font-bold hover:underline inline-flex items-center gap-1" data-testid={`link-project-${p.id}`} data-i18n="off">{p.name}<ArrowUpRight size={16} /></Link>
                  <p className="text-sm text-muted-foreground"><span data-i18n="off">{p.city}</span>, <span data-i18n="off">{p.province}</span> / Revisi {p.revision} / Diperbarui {fmtDate(p.updatedAt)}</p>
                  <p className="text-xs mt-2 text-muted-foreground"><span className="font-mono uppercase tracking-wide">Berikutnya:</span> {g[0] ? <>{g[0].label} ({translate(g[0].note).split('.')[0].toLowerCase()})</> : 'Semua isian dasar terisi; belum berarti aman'}</p>
                </div>
                <div className="p-4 md:w-48 flex md:flex-col justify-between gap-3 border-t md:border-t-0 md:border-l border-border no-print">
                  <div><div className="font-mono text-xs text-muted-foreground">Kelengkapan isian</div><div className="h-1.5 bg-muted mt-1"><div className="h-full bg-accent transition-all" style={{ width: pct + '%' }} /></div><div className="font-mono text-sm mt-1">{pct}%</div></div>
                  <div className="flex gap-1">
                    <Btn sm v="ghost" aria-label="Arsipkan" data-testid={`button-archive-${p.id}`} onClick={async () => { if (!p.archived) setArc(p); else if (await updateProject(p.id, (x) => ({ ...x, archived: false }))) toast({ title: 'Proyek dipulihkan' }); }}>{p.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}</Btn>
                    <Btn sm v="ghost" aria-label="Hapus" data-testid={`button-delete-${p.id}`} onClick={() => setDel(p)}><Trash2 size={15} /></Btn>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {limit && list.length > limit && <div className="mt-3"><Link href="/projects" className="text-sm underline">Lihat semua {list.length} proyek</Link></div>}
      {arc && <Confirm title="Arsipkan proyek?" label="Arsipkan" body={<>Proyek <b data-i18n="off">{arc.name}</b> dipindah ke arsip. Data dan berkas tetap tersimpan dan dapat dipulihkan.</>} onClose={() => setArc(null)} onOk={async () => { if (await updateProject(arc.id, (x) => ({ ...x, archived: true }), false)) toast({ title: 'Proyek diarsipkan' }); }} />}
      {del && <Confirm title="Hapus proyek permanen?" label="Hapus permanen" body={<>Proyek <b data-i18n="off">{del.name}</b> beserta {del.documents.length} berkas di IndexedDB akan dihapus dari perangkat ini dan tidak dapat dikembalikan. Pertimbangkan mengekspor JSON terlebih dahulu.</>} onClose={() => setDel(null)} onOk={async () => { const e = await deleteProject(del.id); toast(e ? { title: 'Dihapus dengan catatan', description: e, variant: 'destructive' } : { title: 'Proyek dihapus' }); }} />}
    </div>
  );
}
