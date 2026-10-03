import { Lock, ArrowRight } from 'lucide-react';
import { Badge, Btn } from '@/components/kit';
import { RLABEL, readiness, type RState } from '@/lib/readiness';
import type { WP } from './common';

const tone: Record<RState, 'ok' | 'warn' | 'bad' | 'muted'> = { ok: 'ok', unconfirmed: 'warn', missing: 'bad', unknown: 'muted' };
export function Readiness({ p, goTab }: WP) {
  const items = readiness(p);
  const c = (s: RState) => items.filter((i) => i.state === s).length;
  return <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
      {(['ok', 'unconfirmed', 'unknown', 'missing'] as RState[]).map((s) => <div key={s} className="bg-card p-3"><div className="font-display text-3xl font-extrabold" data-testid={`count-${s}`}>{c(s)}</div><Badge tone={tone[s]}>{RLABEL[s]}</Badge></div>)}
    </div>
    <p className="text-sm text-muted-foreground border-l-4 border-accent pl-3">Kelengkapan data bukan penilaian keselamatan. Proyek yang terdokumentasi lengkap tetap belum bisa disimpulkan kuat atau amannya. Status "Terisi" berarti ada isian, bukan terverifikasi profesional.</p>
    <ul className="divide-y divide-border border border-border bg-card">
      {items.map((i) => <li key={i.key} className="p-3 flex gap-3 items-start" data-testid={`readiness-${i.key}`}><div className="w-36 shrink-0"><Badge tone={tone[i.state]}>{RLABEL[i.state]}</Badge></div><div className="flex-1"><div className="font-medium text-sm">{i.label}</div><div className="text-xs text-muted-foreground">{i.note}</div></div>{i.state !== 'ok' && <Btn sm onClick={() => goTab(i.tab)}>Lengkapi<ArrowRight size={12} /></Btn>}</li>)}
    </ul>
    <section>
      <h3 className="font-display text-xl font-bold mb-2">Perhitungan teknis</h3>
      {[{ n: 'Pemeriksaan kapasitas elemen struktur', r: 'Belum ada metode yang ditetapkan dan divalidasi oleh insinyur struktur Indonesia yang berkualifikasi. Tidak ada angka yang disimulasikan.' }, { n: 'Evaluasi pembukaan dinding / tambah lantai', r: 'Memerlukan peran struktural terverifikasi, properti material, beban, dan data tanah yang tidak dapat diperoleh dari prototipe ini.' }].map((m) => <div key={m.n} className="border border-dashed border-input bg-muted/40 p-4 mb-2 flex gap-3" data-testid="module-disabled"><Lock size={18} className="shrink-0 text-muted-foreground mt-0.5" /><div><div className="font-medium">{m.n} <Badge>Dinonaktifkan</Badge></div><p className="text-sm text-muted-foreground">{m.r}</p></div></div>)}
    </section>
  </div>;
}
