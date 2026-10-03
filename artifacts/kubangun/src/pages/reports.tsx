import { Link } from 'wouter';
import { FileText, FileJson } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Badge, Btn, Empty, PageHead } from '@/components/kit';
import { downloadText, projectJson, slug } from '@/lib/export';
import { fmtDateTime, modeLabel } from '@/lib/format';

export default function Reports() {
  const { projects } = useStore();
  return <div>
    <PageHead kicker="Laporan" title="Laporan pendahuluan" />
    <p className="text-sm text-muted-foreground max-w-2xl mb-5">Laporan dibuat dari data revisi terkini dan selalu bertanda draf. Gunakan Cetak di peramban lalu pilih Simpan sebagai PDF. Tidak ada laporan yang berstatus ditinjau profesional.</p>
    {projects.length === 0 ? <Empty title="Belum ada proyek" body="Buat proyek untuk menghasilkan laporan." action={<Link href="/projects/new" className="underline text-sm">Buat Proyek</Link>} /> :
      <ul className="space-y-2">{projects.map((p) => <li key={p.id} className="bg-card border border-card-border p-4 flex flex-wrap gap-3 items-center justify-between" data-testid={`row-report-${p.id}`}>
        <div><div className="flex gap-2 mb-1"><Badge tone={p.mode === 'new' ? 'ink' : 'accent'}>{modeLabel(p.mode)}</Badge><Badge>Revisi {p.revision}</Badge>{p.archived && <Badge>Arsip</Badge>}<Badge tone="warn">Pendahuluan</Badge></div><div className="font-display font-bold text-lg">{p.name}</div><div className="text-xs text-muted-foreground font-mono">Diperbarui {fmtDateTime(p.updatedAt)}</div></div>
        <div className="flex gap-2"><Link href={`/projects/${p.id}?tab=laporan`} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-input bg-card rounded-sm hover:bg-muted" data-testid={`link-report-${p.id}`}><FileText size={14} />Buka laporan</Link><Btn sm onClick={() => downloadText(`kubangun-${slug(p.name)}-rev${p.revision}.json`, JSON.stringify(projectJson(p), null, 2))} data-testid={`button-json-${p.id}`}><FileJson size={14} />JSON</Btn></div></li>)}</ul>}
  </div>;
}
