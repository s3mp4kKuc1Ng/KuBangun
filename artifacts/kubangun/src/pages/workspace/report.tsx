import { Printer, FileJson } from 'lucide-react';
import { AreaPreview } from '@/components/area-preview';
import { Btn } from '@/components/kit';
import { downloadText, projectJson, slug } from '@/lib/export';
import { fmtDate, fmtDateTime, fmtNum, fmtSize, modeLabel, roomArea } from '@/lib/format';
import { gaps, RLABEL } from '@/lib/readiness';
import type { Project } from '@/lib/types';

export function ReportView({ p }: { p: Project }) {
  const g = gaps(p);
  const H = ({ n, t }: { n: number; t: string }) => <h3 className="font-display text-lg font-bold mt-6 mb-2 border-b-2 border-foreground pb-1"><span className="font-mono text-accent mr-2">{String(n).padStart(2, '0')}</span>{t}</h3>;
  return <article className="print-area bg-card border border-card-border p-6 md:p-10 text-sm leading-relaxed" data-testid="report-view">
    <div className="border-2 border-destructive text-destructive px-3 py-2 font-mono text-xs uppercase tracking-wider mb-5">Laporan pendahuluan / draf. Bukan hasil tinjauan profesional, bukan sertifikat, bukan izin.</div>
    <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">KuBangun / {modeLabel(p.mode)} / Revisi {p.revision}</div>
    <h2 className="font-display text-3xl font-extrabold">{p.name}</h2>
    <p className="text-muted-foreground">{p.city}, {p.province}. Dibuat dari data lokal pada {fmtDateTime(new Date().toISOString())}; pembaruan terakhir proyek {fmtDateTime(p.updatedAt)}.{p.example && ' Proyek contoh fiktif.'}</p>
    <H n={1} t="Identitas dan profil bangunan" />
    <dl className="grid grid-cols-[170px_1fr] gap-y-1"><dt>Jenis proyek</dt><dd>{modeLabel(p.mode)}</dd><dt>Revisi saat ini</dt><dd>{p.revision}</dd><dt>Jumlah lantai</dt><dd>{p.floors ?? 'Belum diisi'}</dd><dt>Luas lahan</dt><dd>{fmtNum(p.landArea, 'm2')}</dd><dt>Luas telapak</dt><dd>{fmtNum(p.footprintArea, 'm2')}</dd><dt>Luas total lantai</dt><dd>{fmtNum(p.totalArea, 'm2')}</dd><dt>Sistem struktur</dt><dd>{p.structure || 'Belum diisi / tidak diketahui'}</dd><dt>Material</dt><dd>{p.material || 'Belum diisi / tidak diketahui'}</dd><dt>Deskripsi</dt><dd>{p.description || '-'}</dd></dl>
    <p className="text-xs text-muted-foreground mt-1">Seluruh angka adalah isian pengguna dan perkiraan.</p>
    <H n={2} t="Ruang" />
    {p.rooms.length === 0 ? <p>Belum ada ruang dicatat.</p> : <table className="w-full text-left"><thead><tr className="border-b border-border"><th>Ruang</th><th>Lt</th><th>P x L x T (m)</th><th>Luas geometris</th><th>Status</th></tr></thead><tbody>{p.rooms.map((r) => <tr key={r.id} className="border-b border-border/50"><td>{r.name}</td><td>{r.floor}</td><td>{r.length} x {r.width} x {r.height ?? 'tidak diketahui'}</td><td>{roomArea(r)} m2</td><td>{r.confirmed ? 'Dikonfirmasi pengguna' : 'Belum dikonfirmasi'}</td></tr>)}</tbody></table>}
    {p.rooms.length > 0 && <div className="area-preview-grid grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 print:grid-cols-2">{p.rooms.map((r) => <AreaPreview key={r.id} name={r.name} floor={r.floor} length={r.length} width={r.width} testId={`report-preview-${r.id}`} />)}</div>}
    <H n={3} t="Komponen" />
    {p.components.length === 0 ? <p>Belum ada komponen dicatat.</p> : <ul className="list-disc pl-5">{p.components.map((c) => <li key={c.id}>{c.type}: <b>{c.name}</b> ({c.state === 'existing' ? 'eksisting' : 'usulan'}); dimensi: {c.dimensions || 'belum diisi'}; material: {c.material}; {c.confirmed ? 'dikonfirmasi pengguna' : 'belum dikonfirmasi'}.</li>)}</ul>}
    <H n={4} t="Bukti dan dokumen" />
    {p.documents.length === 0 ? <p>Belum ada dokumen.</p> : <ul className="list-disc pl-5">{p.documents.map((d) => <li key={d.id}>{d.name} ({d.mime}, {fmtSize(d.size)}), {d.sourceState === 'existing' ? 'eksisting' : d.sourceState === 'proposed' ? 'usulan' : 'asal tidak diketahui'}, diunggah {fmtDate(d.uploadedAt)}. Belum diverifikasi.</li>)}</ul>}
    {p.mode === 'renovation' && <><H n={5} t="Observasi kondisi eksisting" />{p.observations.length === 0 ? <p>Belum ada observasi.</p> : <ul className="list-disc pl-5">{p.observations.map((o) => <li key={o.id}>{fmtDate(o.date)} / {o.category} / {o.location}: {o.description}{o.crackWidth != null && ` (lebar retak terukur ${o.crackWidth} mm)`}. Penyebab dan signifikansi tidak ditafsirkan.</li>)}</ul>}
      <H n={6} t="Perubahan yang diusulkan" />{p.changes.length === 0 ? <p>Belum ada perubahan.</p> : <ul className="list-disc pl-5">{p.changes.map((c) => <li key={c.id}>{c.type}: {c.description} {c.dimensions && `(usulan: ${c.dimensions})`}. Memerlukan evaluasi profesional.</li>)}</ul>}</>}
    <H n={7} t="Hal yang belum diketahui atau belum pasti" />
    {g.length === 0 ? <p>Semua isian dasar terisi, namun belum diverifikasi profesional.</p> : <ul className="list-disc pl-5">{g.map((i) => <li key={i.key}><b>{i.label}</b> [{RLABEL[i.state]}]: {i.note}</li>)}</ul>}
    <H n={8} t="Catatan lokal" />
    {p.reviewNotes.length === 0 ? <p>Tidak ada.</p> : <ul className="list-disc pl-5">{p.reviewNotes.map((n) => <li key={n.id}>{n.text} (revisi {n.revision})</li>)}</ul>}
    <H n={9} t="Batasan" />
    <ul className="list-disc pl-5 space-y-1"><li>Dokumen ini merangkum data yang dimasukkan pengguna di peramban; tidak ada perhitungan rekayasa dilakukan.</li><li>Dikonfirmasi pengguna bukan verifikasi profesional. Tidak ada insinyur atau peninjau yang terlibat.</li><li>Laporan tidak menyatakan keselamatan, kelayakan hunian, atau kepatuhan regulasi, dan bukan pengganti izin atau penilaian ahli.</li><li>Status simulasi tinjauan tidak dikirim ke pihak mana pun.</li></ul>
  </article>;
}

export function ReportActions({ p }: { p: Project }) {
  return <>
    <Btn onClick={() => window.print()} data-testid="button-print"><Printer size={15} />Cetak / Simpan PDF</Btn>
    <Btn onClick={() => downloadText(`kubangun-${slug(p.name)}-rev${p.revision}.json`, JSON.stringify(projectJson(p), null, 2))} data-testid="button-export-json"><FileJson size={15} />Ekspor JSON</Btn>
  </>;
}
