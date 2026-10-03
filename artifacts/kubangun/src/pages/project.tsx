import { useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { ArrowLeft, Archive, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Badge, Btn, Confirm, Empty } from '@/components/kit';
import { cx, modeLabel } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { Profile } from './workspace/profile';
import { Rooms } from './workspace/rooms';
import { Documents } from './workspace/documents';
import { Observations, Changes } from './workspace/renovation';
import { Readiness } from './workspace/readiness';
import { Review } from './workspace/review';
import { ReportView, ReportActions } from './workspace/report';
import type { Project } from '@/lib/types';
import type { WP } from './workspace/common';
import { WorkPlanning } from './workspace/work';
import { OwnerInbox } from './workspace/execution';

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { projects, updateProject, deleteProject } = useStore();
  const [, nav] = useLocation();
  const { toast } = useToast();
  const [tab, setTabState] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'profil');
  const [del, setDel] = useState(false);
  const [arc, setArc] = useState(false);
  const p = projects.find((x) => x.id === id);
  if (!p) return <Empty title="Proyek tidak ditemukan" body="Proyek ini mungkin sudah dihapus atau data lokal di peramban ini telah dibersihkan." action={<Link href="/projects" className="underline text-sm">Kembali ke daftar proyek</Link>} />;
  const reno = p.mode === 'renovation';
  const unread = p.workPlan?.notifications.filter((n) => !n.readAt).length ?? 0;
  const tabs = [['profil', 'Profil'], ['ruang', 'Ruang & Komponen'], ['pekerjaan', 'Pekerjaan & Material'], ['notifikasi', `Notifikasi lokal (${unread})`], ['dokumen', 'Dokumen'], ...(reno ? [['observasi', 'Kondisi Eksisting'], ['perubahan', 'Rencana Perubahan']] : []), ['kesiapan', 'Kesiapan Data'], ['tinjauan', 'Tinjauan'], ['laporan', 'Laporan']];
  const setTab = (t: string) => { setTabState(t); history.replaceState(null, '', `?tab=${t}`); };
  const props: WP = { p, goTab: setTab, up: (fn: (x: Project) => Project, bump = true) => { updateProject(p.id, fn, bump); } };
  const cur = tabs.some((t) => t[0] === tab) ? tab : 'profil';
  return (
    <div>
      <Link href="/projects" className="text-sm inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-3 no-print"><ArrowLeft size={14} />Semua proyek</Link>
      <div className="flex flex-wrap justify-between gap-3 mb-5 no-print">
        <div>
          <div className="flex gap-2 flex-wrap mb-2"><Badge tone={reno ? 'accent' : 'ink'}>{modeLabel(p.mode)}</Badge><Badge>Revisi {p.revision}</Badge><Badge tone={p.status === 'draft' ? 'muted' : 'warn'}>{p.status === 'draft' ? 'Draf' : 'Tinjauan diminta (simulasi, tidak terkirim)'}</Badge>{p.example && <Badge tone="warn">Contoh fiktif</Badge>}{p.archived && <Badge>Arsip</Badge>}</div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold" data-testid="text-project-name">{p.name}</h1>
          <p className="text-sm text-muted-foreground">{p.city}, {p.province}</p>
        </div>
        <div className="flex gap-2 items-start">
          <Btn sm onClick={() => (p.archived ? updateProject(p.id, (x) => ({ ...x, archived: false }), false) : setArc(true))} data-testid="button-archive-project"><Archive size={14} />{p.archived ? 'Pulihkan' : 'Arsipkan'}</Btn>
          <Btn sm onClick={() => setDel(true)} data-testid="button-delete-project"><Trash2 size={14} />Hapus</Btn>
        </div>
      </div>
      <div className="flex overflow-x-auto border-b-2 border-border mb-6 no-print" role="tablist">
        {tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={cur === k} data-testid={`tab-${k}`} onClick={() => setTab(k)} className={cx('px-4 py-2.5 text-sm whitespace-nowrap font-medium -mb-[2px] border-b-[3px] transition-colors', cur === k ? 'border-accent text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>{l}</button>)}
      </div>
      <div key={cur} className="rise">
        {cur === 'profil' && <Profile {...props} />}
        {cur === 'ruang' && <Rooms {...props} />}
        {cur === 'pekerjaan' && <WorkPlanning p={p} />}
        {cur === 'notifikasi' && <OwnerInbox p={p} goWork={(workId?: string) => { setTabState('pekerjaan'); history.replaceState(null, '', `?tab=pekerjaan${workId ? `&focus=${encodeURIComponent(workId)}` : ''}`); }} />}
        {cur === 'dokumen' && <Documents {...props} />}
        {cur === 'observasi' && <Observations {...props} />}
        {cur === 'perubahan' && <Changes {...props} />}
        {cur === 'kesiapan' && <Readiness {...props} />}
        {cur === 'tinjauan' && <Review {...props} />}
        {cur === 'laporan' && <div className="space-y-4"><div className="flex gap-2 flex-wrap no-print"><ReportActions p={p} /></div><ReportView p={p} /></div>}
      </div>
      {arc && <Confirm title="Arsipkan proyek?" label="Arsipkan" body="Proyek dipindah ke arsip dan dapat dipulihkan kapan saja." onClose={() => setArc(false)} onOk={() => { updateProject(p.id, (x) => ({ ...x, archived: true }), false); toast({ title: 'Proyek diarsipkan' }); nav('/projects'); }} />}
      {del && <Confirm title="Hapus proyek permanen?" label="Hapus permanen" body={<><b>{p.name}</b> dan {p.documents.length} berkas di IndexedDB akan dihapus dari perangkat ini selamanya.</>} onClose={() => setDel(false)} onOk={async () => { const e = await deleteProject(p.id); toast(e ? { title: 'Dihapus dengan catatan', description: e, variant: 'destructive' } : { title: 'Proyek dihapus' }); nav('/projects'); }} />}
    </div>
  );
}
