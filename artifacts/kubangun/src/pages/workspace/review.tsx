import { useState } from 'react';
import { Send, Trash2, CircleSlash } from 'lucide-react';
import { Badge, Btn, Empty, inputCls } from '@/components/kit';
import { fmtDateTime, uid } from '@/lib/format';
import { gaps } from '@/lib/readiness';
import type { WP } from './common';

export function Review({ p, up }: WP) {
  const [t, setT] = useState('');
  const g = gaps(p);
  const requested = p.status === 'review-requested';
  return <div className="space-y-6">
    <div className="bg-primary text-primary-foreground p-5">
      <div className="font-mono text-xs uppercase tracking-widest opacity-70">Pratinjau tinjauan / revisi {p.revision}</div>
      <p className="font-display text-2xl font-bold mt-1">{requested ? `Permintaan tinjauan disimulasikan pada revisi ${p.reviewRequestedRevision}` : 'Belum ada permintaan tinjauan'}</p>
      <p className="text-sm opacity-80 mt-2" data-testid="text-not-sent">Simulasi lokal. Tidak ada yang dikirim ke siapa pun, tidak ada peninjau yang ditugaskan, dan tidak ada sertifikasi atau persetujuan yang dapat diterbitkan di sini.{requested && p.reviewRequestedAt && ` Dicatat ${fmtDateTime(p.reviewRequestedAt)}.`}</p>
      <div className="mt-4 flex gap-2 flex-wrap">
        {requested ? <Btn onClick={() => up((x) => ({ ...x, status: 'draft', reviewRequestedAt: undefined, reviewRequestedRevision: undefined }), false)} data-testid="button-cancel-request" className="text-foreground">Batalkan simulasi</Btn>
          : <Btn v="accent" onClick={() => up((x) => ({ ...x, status: 'review-requested', reviewRequestedAt: new Date().toISOString(), reviewRequestedRevision: x.revision }), false)} data-testid="button-request-review"><Send size={14} />Simulasikan permintaan tinjauan</Btn>}
        <span className="inline-flex items-center gap-2 text-xs opacity-70"><CircleSlash size={14} />Tombol persetujuan sengaja tidak ada.</span>
      </div>
    </div>
    <section className="grid md:grid-cols-2 gap-4">
      <div className="bg-card border border-card-border p-4"><h3 className="font-display font-bold text-lg mb-2">Yang akan dilihat peninjau</h3><ul className="text-sm space-y-1"><li>Revisi: <b>{p.revision}</b></li><li>Ruang: {p.rooms.length}, komponen: {p.components.length}, dokumen: {p.documents.length}</li>{p.mode === 'renovation' && <li>Observasi: {p.observations.length}, perubahan usulan: {p.changes.length}</li>}<li>Isian belum lengkap/pasti: <b>{g.length}</b></li></ul><p className="text-xs text-muted-foreground mt-2">Mengubah data apa pun menaikkan revisi dan mereset permintaan tinjauan.</p></div>
      <div className="bg-card border border-card-border p-4"><h3 className="font-display font-bold text-lg mb-2">Informasi yang masih kurang</h3>{g.length === 0 ? <p className="text-sm text-muted-foreground">Semua isian dasar terisi. Ini belum berarti ada verifikasi profesional.</p> : <ul className="text-sm space-y-1 max-h-48 overflow-auto">{g.map((i) => <li key={i.key}>{i.label}: <span className="text-muted-foreground">{i.note.split('.')[0]}</span></li>)}</ul>}</div>
    </section>
    <section>
      <h3 className="font-display text-xl font-bold mb-2">Catatan tinjauan lokal</h3>
      <p className="text-sm text-muted-foreground mb-3">Catatan pribadi untuk Anda sendiri atau untuk dibawa ke profesional. Bukan temuan peninjau.</p>
      <div className="flex gap-2 mb-3"><textarea data-testid="input-note" rows={2} className={inputCls} placeholder="mis. Tanyakan peran struktural dinding dapur" value={t} onChange={(e) => setT(e.target.value)} /><Btn v="primary" disabled={!t.trim()} data-testid="button-add-note" onClick={async () => { if (await up((x) => ({ ...x, reviewNotes: [...x.reviewNotes, { id: uid(), text: t.trim(), createdAt: new Date().toISOString(), revision: x.revision }] }), false)) setT(''); }}>Tambah</Btn></div>
      {p.reviewNotes.length === 0 ? <Empty title="Belum ada catatan" body="Tambahkan pertanyaan atau hal yang ingin dibahas dengan profesional." /> :
        <ul className="space-y-2">{[...p.reviewNotes].reverse().map((n) => <li key={n.id} className="bg-card border border-card-border p-3 flex gap-3 justify-between" data-testid={`note-${n.id}`}><div><p className="text-sm"><span data-i18n="off">{n.text}</span></p><div className="mt-1 flex gap-2"><Badge>Revisi {n.revision}</Badge><span className="text-xs font-mono text-muted-foreground">{fmtDateTime(n.createdAt)}</span></div></div><Btn sm v="ghost" aria-label="Hapus catatan" onClick={() => up((x) => ({ ...x, reviewNotes: x.reviewNotes.filter((y) => y.id !== n.id) }), false)}><Trash2 size={14} /></Btn></li>)}</ul>}
    </section>
  </div>;
}
