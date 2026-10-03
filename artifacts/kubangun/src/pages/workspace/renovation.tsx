import { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Badge, Btn, Confirm, Empty, Field, Modal, inputCls } from '@/components/kit';
import { CHANGE_TYPES, OBS_CATEGORIES, fmtDate, numOrNull, uid } from '@/lib/format';
import type { Change, Observation } from '@/lib/types';
import type { WP } from './common';
import { RenovationRoomComparison } from '@/components/renovation-room-comparison';

function ObsForm({ p, init, onSave, onClose }: { p: WP['p']; init: Observation | null; onSave: (o: Observation) => void; onClose: () => void }) {
  const [f, setF] = useState({ location: init?.location ?? '', category: init?.category ?? OBS_CATEGORIES[0], description: init?.description ?? '', date: init?.date ?? new Date().toISOString().slice(0, 10), crack: init?.crackWidth != null ? String(init.crackWidth) : '', photo: init?.photoDocumentId ?? '' });
  const [err, setErr] = useState('');
  const imgs = p.documents.filter((d) => d.mime.startsWith('image/'));
  const go = () => {
    if (!f.location.trim() || !f.description.trim()) return setErr('Lokasi dan deskripsi wajib diisi.');
    if (!f.date) return setErr('Tanggal observasi wajib diisi.');
    const c = numOrNull(f.crack);
    if (f.crack.trim() && (c == null || c <= 0)) return setErr('Lebar retak harus angka lebih dari 0 (mm) atau dikosongkan.');
    onSave({ id: init?.id ?? uid(), location: f.location.trim(), category: f.category, description: f.description.trim(), date: f.date, crackWidth: c ?? undefined, photoDocumentId: f.photo || undefined });
  };
  return <Modal title={init ? 'Ubah observasi' : 'Tambah observasi'} onClose={onClose}><div className="space-y-3">
    <Field label="Lokasi / komponen"><input data-testid="input-obs-location" className={inputCls} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Kategori"><select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{OBS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field><Field label="Tanggal"><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field></div>
    <Field label="Deskripsi (apa yang terlihat, bukan penyebabnya)"><textarea data-testid="input-obs-desc" rows={3} className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
    {f.category === 'Retak' && <Field label="Lebar retak terukur (mm), opsional" hint="Tidak ada ambang 'berbahaya' di aplikasi ini. Penafsiran menjadi urusan profesional."><input data-testid="input-obs-crack" className={inputCls} value={f.crack} onChange={(e) => setF({ ...f, crack: e.target.value })} /></Field>}
    <Field label="Foto dari dokumen (opsional)"><select data-testid="select-obs-photo" className={inputCls} value={f.photo} onChange={(e) => setF({ ...f, photo: e.target.value })}><option value="">Tanpa foto</option>{imgs.map((d) => <option data-i18n="off" key={d.id} value={d.id}>{d.name}</option>)}</select>{imgs.length === 0 && <span className="text-xs text-muted-foreground">Unggah foto JPG/PNG di tab Dokumen terlebih dulu.</span>}</Field>
    {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
    <div className="flex justify-end gap-2"><Btn onClick={onClose}>Batal</Btn><Btn v="primary" onClick={go} data-testid="button-save-obs">Simpan</Btn></div></div></Modal>;
}
function ChgForm({ p, init, onSave, onClose }: { p: WP['p']; init: Change | null; onSave: (c: Change) => void; onClose: () => void }) {
  const [f, setF] = useState({ type: init?.type ?? CHANGE_TYPES[0], description: init?.description ?? '', componentId: init?.componentId ?? '', dimensions: init?.dimensions ?? '' });
  const [err, setErr] = useState('');
  return <Modal title={init ? 'Ubah perubahan' : 'Tambah perubahan usulan'} onClose={onClose}><div className="space-y-3">
    <Field label="Jenis perubahan"><select data-testid="select-chg-type" className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{CHANGE_TYPES.map((c) => <option key={c}>{c}</option>)}</select></Field>
    <Field label="Deskripsi"><textarea data-testid="input-chg-desc" rows={3} className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
    <Field label="Komponen terdampak"><select className={inputCls} value={f.componentId} onChange={(e) => setF({ ...f, componentId: e.target.value })}><option value="">Belum ditentukan</option>{p.components.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.state === 'existing' ? 'eksisting' : 'usulan'})</option>)}</select></Field>
    <Field label="Dimensi usulan" hint="Data usulan disimpan terpisah; data eksisting tidak ditimpa."><input className={inputCls} value={f.dimensions} onChange={(e) => setF({ ...f, dimensions: e.target.value })} placeholder="mis. lebar bukaan 2,0 m" /></Field>
    {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
    <div className="flex justify-end gap-2"><Btn onClick={onClose}>Batal</Btn><Btn v="primary" data-testid="button-save-chg" onClick={() => { if (!f.description.trim()) return setErr('Deskripsi wajib diisi.'); onSave({ id: init?.id ?? uid(), type: f.type, description: f.description.trim(), componentId: f.componentId || undefined, dimensions: f.dimensions.trim() }); }}>Simpan</Btn></div></div></Modal>;
}

export function Observations({ p, up }: WP) {
  const [m, setM] = useState<Observation | null | 'new'>(null);
  const [del, setDel] = useState<Observation | null>(null);
  const doc = (id?: string) => p.documents.find((d) => d.id === id)?.name;
  return <div className="space-y-4">
    <div className="flex justify-between items-center"><p className="text-sm text-muted-foreground max-w-xl">Catat apa yang terlihat. Aplikasi tidak menentukan penyebab atau tingkat keparahan.</p><Btn v="primary" sm onClick={() => setM('new')} data-testid="button-add-obs"><Plus size={14} />Tambah observasi</Btn></div>
    {p.observations.length === 0 ? <Empty title="Belum ada observasi" body="Retak, lembap, korosi, deformasi: catat lokasi, tanggal, dan foto bila ada." action={<Btn onClick={() => setM('new')}>Catat observasi</Btn>} /> :
      <ul className="space-y-2">{p.observations.map((o) => <li key={o.id} className="bg-card border border-card-border p-4 border-l-4 border-l-accent" data-testid={`card-obs-${o.id}`}>
        <div className="flex gap-2 flex-wrap items-center mb-1"><Badge tone="accent">{o.category}</Badge><span className="font-mono text-xs text-muted-foreground">{fmtDate(o.date)}</span>{o.crackWidth != null && <Badge>Lebar retak {o.crackWidth} mm</Badge>}{o.photoDocumentId && <Badge tone="ok">Foto: {doc(o.photoDocumentId) ?? 'dihapus'}</Badge>}</div>
        <div className="font-medium"><span data-i18n="off">{o.location}</span></div><p className="text-sm text-muted-foreground"><span data-i18n="off">{o.description}</span></p>
        <div className="flex gap-1 mt-2"><Btn sm onClick={() => setM(o)}><Pencil size={13} />Ubah</Btn><Btn sm v="ghost" onClick={() => setDel(o)} aria-label="Hapus"><Trash2 size={13} /></Btn></div></li>)}</ul>}
    {m && <ObsForm p={p} init={m === 'new' ? null : m} onClose={() => setM(null)} onSave={async (o) => { if (await up((x) => ({ ...x, observations: x.observations.some((y) => y.id === o.id) ? x.observations.map((y) => (y.id === o.id ? o : y)) : [...x.observations, o] }))) setM(null); }} />}
    {del && <Confirm title="Hapus observasi?" label="Hapus" body={<>Hapus observasi di <b><span data-i18n="off">{del.location}</span></b>? Revisi naik.</>} onClose={() => setDel(null)} onOk={() => up((x) => ({ ...x, observations: x.observations.filter((o) => o.id !== del.id) }))} />}
  </div>;
}
export function Changes({ p, up }: WP) {
  const [m, setM] = useState<Change | null | 'new'>(null);
  const [del, setDel] = useState<Change | null>(null);
  const comp = (id?: string) => p.components.find((c) => c.id === id);
  return <div className="space-y-4">
    <RenovationRoomComparison rooms={p.rooms} testId="changes-room-comparison" />
    <div className="flex justify-between items-center gap-3"><p className="text-sm text-muted-foreground max-w-xl">Perubahan usulan. Pembongkaran, tambah lantai, perubahan beban, dan elemen yang peran strukturalnya belum jelas membutuhkan evaluasi profesional; aplikasi ini tidak memberi izin untuk melanjutkan.</p><Btn v="primary" sm onClick={() => setM('new')} data-testid="button-add-change"><Plus size={14} />Tambah perubahan</Btn></div>
    {p.changes.length === 0 ? <Empty title="Belum ada perubahan usulan" body="Tambahkan rencana seperti membuka dinding atau menambah lantai, lengkap dengan komponen terdampak." action={<Btn onClick={() => setM('new')}>Tambah perubahan</Btn>} /> :
      <ul className="space-y-2">{p.changes.map((c) => { const k = comp(c.componentId); return <li key={c.id} className="bg-card border border-card-border p-4" data-testid={`card-chg-${c.id}`}>
        <div className="flex gap-2 flex-wrap mb-1"><Badge tone="accent">{c.type}</Badge><Badge tone="warn">Perlu evaluasi profesional</Badge></div>
        <p className="font-medium"><span data-i18n="off">{c.description}</span></p>
        <div className="grid sm:grid-cols-2 gap-px bg-border border border-border mt-2 text-sm"><div className="bg-card p-2"><div className="text-xs font-mono uppercase text-muted-foreground">Eksisting</div>{k ? `${k.name}: ${k.dimensions || 'dimensi belum diisi'}; ${k.material}` : 'Komponen belum ditautkan'}</div><div className="bg-card p-2"><div className="text-xs font-mono uppercase text-muted-foreground">Usulan</div>{c.dimensions || 'Dimensi belum diisi'}</div></div>
        <div className="flex gap-1 mt-2"><Btn sm onClick={() => setM(c)}><Pencil size={13} />Ubah</Btn><Btn sm v="ghost" onClick={() => setDel(c)} aria-label="Hapus"><Trash2 size={13} /></Btn></div></li>; })}</ul>}
    {m && <ChgForm p={p} init={m === 'new' ? null : m} onClose={() => setM(null)} onSave={async (c) => { if (await up((x) => ({ ...x, changes: x.changes.some((y) => y.id === c.id) ? x.changes.map((y) => (y.id === c.id ? c : y)) : [...x.changes, c] }))) setM(null); }} />}
    {del && <Confirm title="Hapus perubahan usulan?" label="Hapus" body="Perubahan ini dihapus dan revisi naik." onClose={() => setDel(null)} onOk={() => up((x) => ({ ...x, changes: x.changes.filter((c) => c.id !== del.id) }))} />}
  </div>;
}
