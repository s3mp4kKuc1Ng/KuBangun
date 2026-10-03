import { Link } from 'wouter';
import { Plus, ShieldAlert } from 'lucide-react';
import { useStore } from '@/lib/store';
import { PageHead } from '@/components/kit';
import { ProjectList } from '@/components/project-list';
import { gaps } from '@/lib/readiness';

export default function Dashboard() {
  const { projects, settings } = useStore();
  const act = projects.filter((p) => !p.archived);
  const stats = [
    { n: act.length, l: 'Proyek aktif' },
    { n: act.filter((p) => p.mode === 'renovation').length, l: 'Renovasi' },
    { n: act.reduce((s, p) => s + gaps(p).length, 0), l: 'Isian kosong / belum pasti' },
    { n: act.filter((p) => p.status === 'review-requested').length, l: 'Tinjauan simulasi' },
  ];
  return (
    <div>
      <PageHead kicker={settings.name ? `Halo, ${settings.name}` : 'Beranda'} title="Bukti sebelum bangun">
        <Link href="/projects/new" className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-2 text-sm font-semibold rounded-sm" data-testid="link-create-project"><Plus size={16} />Buat Proyek</Link>
      </PageHead>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border mb-6 rise">
        {stats.map((s) => <div key={s.l} className="bg-card p-4"><div className="font-display text-4xl font-extrabold">{s.n}</div><div className="text-xs font-mono uppercase tracking-wide text-muted-foreground">{s.l}</div></div>)}
      </div>
      <div className="flex gap-3 border border-border bg-card p-4 mb-6 text-sm rise" data-testid="notice-limits"><ShieldAlert className="shrink-0 text-accent" /><p><b>Prototipe penataan bukti.</b> KuBangun belum menghitung kekuatan struktur, tidak menerbitkan persetujuan, dan tidak ada insinyur terverifikasi di dalamnya. Semua data di sini milik peramban Anda.</p></div>
      <h2 className="font-display text-xl font-bold mb-3">Proyek Anda</h2>
      <ProjectList limit={6} />
    </div>
  );
}
