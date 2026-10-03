import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Btn, Confirm, Empty, Field, Modal, inputCls } from '@/components/kit';
import { COMPONENT_TYPES, numOrNull, roomArea, uid, fmtNum } from '@/lib/format';
import type { Component, Room } from '@/lib/types';
import { SRC_LABEL, type WP } from './common';

const note = 'Dikonfirmasi pengguna hanya berarti Anda memeriksa bahwa isian sesuai sumbernya; ini bukan verifikasi profesional dan bukan penilaian kecukupan struktur.';

function RoomForm({ p, init, onSave, onClose }: { p: WP['p']; init: Room | null; onSave: (r: Room) => void; onClose: () => void }) {
  const [f, setF] = useState({ name: init?.name ?? '', floor: String(init?.floor ?? 1), length: init ? String(init.length) : '', width: init ? String(init.width) : '', height: init?.height != null ? String(init.height) : '', source: init?.source ?? 'manual', documentId: init?.documentId ?? '', confirmed: init?.confirmed ?? false });
  const [err, setErr] = useState('');
  const go = () => {
    const l = numOrNull(f.length), w = numOrNull(f.width), h = numOrNull(f.height), fl = numOrNull(f.floor);
    if (!f.name.trim()) return setErr('Nama ruang wajib diisi.');
    if (l == null || l <= 0 || w == null || w <= 0) return setErr('Panjang dan lebar harus angka lebih dari 0 (meter).');
    if (f.height.trim() && (h == null || h <= 0)) return setErr('Tinggi harus lebih dari 0 atau dikosongkan (belum diketahui).');
    if (fl == null || !Number.isInteger(fl) || fl < 1) return setErr('Lantai harus bilangan bulat positif.');
    if (f.source === 'dokumen' && !f.documentId) return setErr('Pilih dokumen sumber, atau ubah sumber menjadi manual.');
    onSave({ id: init?.id ?? uid(), name: f.name.trim(), floor: fl, length: l, width: w, height: h, source: f.source, documentId: f.source === 'dokumen' ? f.documentId : undefined, confirmed: f.confirmed });
  };
  return <Modal title={init ? 'Ubah ruang' : 'Tambah ruang'} onClose={onClose}><div className="space-y-3">
    <Field label="Nama ruang"><input data-testid="input-room-name" className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Lantai ke-"><input className={inputCls} value={f.floor} onChange={(e) => setF({ ...f, floor: e.target.value })} /></Field><Field label="Tinggi bersih (m)" hint="Kosong = belum diketahui"><input data-testid="input-room-height" className={inputCls} value={f.height} onChange={(e) => setF({ ...f, height: e.target.value })} /></Field>
    <Field label="Panjang (m)"><input data-testid="input-room-length" className={inputCls} value={f.length} onChange={(e) => setF({ ...f, length: e.target.value })} /></Field><Field label="Lebar (m)"><input data-testid="input-room-width" className={inputCls} value={f.width} onChange={(e) => setF({ ...f, width: e.target.value })} /></Field></div>
    <p className="text-xs font-mono bg-muted p-2">Luas geometris = {numOrNull(f.length) && numOrNull(f.width) ? roomArea({ length: numOrNull(f.length)!, width: numOrNull(f.width)! }) + ' m2' : '-'} (panjang x lebar saja)</p>
    <Field label="Sumber ukuran"><select className={inputCls} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as Room['source'] })}><option value="manual">Diukur / diisi manual</option><option value="dokumen">Dibaca dari dokumen lalu diketik manual</option><option value="tidak-diketahui">Tidak diketahui</option></select></Field>
    {f.source === 'dokumen' && <Field label="Dokumen sumber"><select data-testid="select-room-doc" className={inputCls} value={f.documentId} onChange={(e) => setF({ ...f, documentId: e.target.value })}><option value="">Pilih dokumen</option>{p.documents.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>{p.documents.length === 0 && <span className="text-xs text-destructive">Belum ada dokumen. Unggah di tab Dokumen.</span>}</Field>}
    <label className="flex gap-2 text-sm items-start"><input type="checkbox" className="mt-1" checked={f.confirmed} onChange={(e) => setF({ ...f, confirmed: e.target.checked })} data-testid="check-room-confirmed" /><span>Saya mengonfirmasi isian ini sesuai sumbernya.<br /><span className="text-xs text-muted-foreground">{note}</span></span></label>
    {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
    <div className="flex justify-end gap-2"><Btn onClick={onClose}>Batal</Btn><Btn v="primary" onClick={go} data-testid="button-save-room">Simpan</Btn></div></div></Modal>;
}

function CompForm({ p, init, onSave, onClose }: { p: WP['p']; init: Component | null; onSave: (c: Component) => void; onClose: () => void }) {
  const [f, setF] = useState({ type: init?.type ?? COMPONENT_TYPES[0], name: init?.name ?? '', dimensions: init?.dimensions ?? '', material: init?.material ?? '', state: init?.state ?? (p.mode === 'new' ? 'proposed' : 'existing'), source: init?.source ?? 'manual', documentId: init?.documentId ?? '', confirmed: init?.confirmed ?? false });
  const [err, setErr] = useState('');
  const go = () => {
    if (!f.name.trim()) return setErr('Nama/identitas komponen wajib diisi.');
    if (f.source === 'dokumen' && !f.documentId) return setErr('Pilih dokumen sumber, atau ubah sumber.');
    onSave({ id: init?.id ?? uid(), type: f.type, name: f.name.trim(), dimensions: f.dimensions.trim(), material: f.material.trim() || 'Tidak diketahui', state: f.state as Component['state'], source: f.source as Component['source'], documentId: f.source === 'dokumen' ? f.documentId : undefined, confirmed: f.confirmed });
  };
  return <Modal title={init ? 'Ubah komponen' : 'Tambah komponen'} onClose={onClose}><div className="space-y-3">
    <div className="grid grid-cols-2 gap-3"><Field label="Jenis"><select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{COMPONENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
    <Field label="Keadaan fisik"><select data-testid="select-comp-state" className={inputCls} value={f.state} onChange={(e) => setF({ ...f, state: e.target.value as Component['state'] })}><option value="existing">Eksisting</option><option value="proposed">Usulan</option></select></Field></div>
    <Field label="Nama / identitas"><input data-testid="input-comp-name" className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
    <Field label="Dimensi (satuan wajib)" hint="Contoh: panjang 3,0 m; tinggi 2,8 m; tebal 12 cm"><input data-testid="input-comp-dim" className={inputCls} value={f.dimensions} onChange={(e) => setF({ ...f, dimensions: e.target.value })} /></Field>
    <Field label="Material" hint="Kosong = Tidak diketahui. Material tersembunyi butuh bukti."><input data-testid="input-comp-material" className={inputCls} value={f.material} onChange={(e) => setF({ ...f, material: e.target.value })} /></Field>
    <Field label="Sumber"><select className={inputCls} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as Component['source'] })}><option value="manual">Diukur / diisi manual</option><option value="dokumen">Dibaca dari dokumen lalu diketik manual</option><option value="tidak-diketahui">Tidak diketahui</option></select></Field>
    {f.source === 'dokumen' && <Field label="Dokumen sumber"><select className={inputCls} value={f.documentId} onChange={(e) => setF({ ...f, documentId: e.target.value })}><option value="">Pilih dokumen</option>{p.documents.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>}
    <label className="flex gap-2 text-sm items-start"><input type="checkbox" className="mt-1" checked={f.confirmed} onChange={(e) => setF({ ...f, confirmed: e.target.checked })} /><span>Saya mengonfirmasi isian ini sesuai sumbernya.<br /><span className="text-xs text-muted-foreground">{note}</span></span></label>
    {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
    <div className="flex justify-end gap-2"><Btn onClick={onClose}>Batal</Btn><Btn v="primary" onClick={go} data-testid="button-save-comp">Simpan</Btn></div></div></Modal>;
}

export function Rooms({ p, up }: WP) {
  const [room, setRoom] = useState<Room | null | 'new'>(null);
  const [comp, setComp] = useState<Component | null | 'new'>(null);
  const [del, setDel] = useState<{ k: 'r' | 'c'; id: string; name: string } | null>(null);
  const docName = (id?: string) => p.documents.find((d) => d.id === id)?.name;
  return (
    <div className="space-y-8">
      <section>
        <div className="flex justify-between items-center mb-3"><h3 className="font-display text-xl font-bold">Ruang ({p.rooms.length})</h3><Btn v="primary" sm onClick={() => setRoom('new')} data-testid="button-add-room"><Plus size={14} />Tambah ruang</Btn></div>
        {p.rooms.length === 0 ? <Empty title="Belum ada ruang" body="Catat nama, lantai, panjang, lebar, dan tinggi. Hanya luas geometris persegi panjang yang dihitung." action={<Btn onClick={() => setRoom('new')}>Tambah ruang pertama</Btn>} /> :
          <div className="overflow-x-auto border border-border bg-card"><table className="w-full text-sm"><thead className="bg-muted text-left text-xs uppercase tracking-wider font-mono"><tr><th className="p-2">Ruang</th><th className="p-2">Lt</th><th className="p-2">P x L x T (m)</th><th className="p-2">Luas</th><th className="p-2">Sumber</th><th className="p-2">Status</th><th /></tr></thead><tbody>
            {p.rooms.map((r) => <tr key={r.id} className="border-t border-border" data-testid={`row-room-${r.id}`}><td className="p-2 font-medium">{r.name}</td><td className="p-2">{r.floor}</td><td className="p-2 font-mono">{r.length} x {r.width} x {r.height ?? '?'}</td><td className="p-2 font-mono">{roomArea(r)} m2</td><td className="p-2 text-xs">{SRC_LABEL[r.source]}{r.documentId && <div className="text-muted-foreground">{docName(r.documentId) ?? 'dokumen dihapus'}</div>}</td><td className="p-2"><Badge tone={r.confirmed ? 'ok' : 'warn'}>{r.confirmed ? 'Dikonfirmasi pengguna' : 'Belum dikonfirmasi'}</Badge></td><td className="p-2 whitespace-nowrap"><Btn sm v="ghost" aria-label="Ubah" onClick={() => setRoom(r)}><Pencil size={14} /></Btn><Btn sm v="ghost" aria-label="Hapus" onClick={() => setDel({ k: 'r', id: r.id, name: r.name })}><Trash2 size={14} /></Btn></td></tr>)}
          </tbody></table></div>}
      </section>
      <section>
        <div className="flex justify-between items-center mb-3"><h3 className="font-display text-xl font-bold">Komponen ({p.components.length})</h3><Btn v="primary" sm onClick={() => setComp('new')} data-testid="button-add-component"><Plus size={14} />Tambah komponen</Btn></div>
        {p.components.length === 0 ? <Empty title="Belum ada komponen" body="Dinding, kolom, balok, pelat, atap, pondasi, bukaan. Pisahkan kondisi eksisting dan usulan; dimensi tersembunyi tanpa bukti ditandai tidak diketahui." action={<Btn onClick={() => setComp('new')}>Tambah komponen pertama</Btn>} /> :
          <div className="grid md:grid-cols-2 gap-3">{p.components.map((c) => <div key={c.id} className="bg-card border border-card-border p-4" data-testid={`card-comp-${c.id}`}>
            <div className="flex gap-2 mb-1 flex-wrap"><Badge tone={c.state === 'existing' ? 'ink' : 'accent'}>{c.state === 'existing' ? 'Eksisting' : 'Usulan'}</Badge><Badge>{c.type}</Badge><Badge tone={c.confirmed ? 'ok' : 'warn'}>{c.confirmed ? 'Dikonfirmasi pengguna' : 'Belum dikonfirmasi'}</Badge></div>
            <div className="font-display font-bold text-lg">{c.name}</div>
            <dl className="text-sm mt-1 grid grid-cols-[90px_1fr] gap-y-0.5"><dt className="text-muted-foreground">Dimensi</dt><dd>{c.dimensions || 'Belum diisi'}</dd><dt className="text-muted-foreground">Material</dt><dd>{c.material}</dd><dt className="text-muted-foreground">Sumber</dt><dd>{SRC_LABEL[c.source]}{c.documentId && ` : ${docName(c.documentId) ?? 'dokumen dihapus'}`}</dd></dl>
            <div className="flex gap-1 mt-2"><Btn sm onClick={() => setComp(c)}>Ubah</Btn><Btn sm v="ghost" onClick={() => setDel({ k: 'c', id: c.id, name: c.name })}>Hapus</Btn></div></div>)}</div>}
      </section>
      <p className="text-xs text-muted-foreground">Total luas ruang tercatat: {fmtNum(Math.round(p.rooms.reduce((s, r) => s + roomArea(r), 0) * 100) / 100, 'm2')} (jumlah geometris, bukan luas terverifikasi).</p>
      {room && <RoomForm p={p} init={room === 'new' ? null : room} onClose={() => setRoom(null)} onSave={(r) => { up((x) => ({ ...x, rooms: x.rooms.some((y) => y.id === r.id) ? x.rooms.map((y) => (y.id === r.id ? r : y)) : [...x.rooms, r] })); setRoom(null); }} />}
      {comp && <CompForm p={p} init={comp === 'new' ? null : comp} onClose={() => setComp(null)} onSave={(c) => { up((x) => ({ ...x, components: x.components.some((y) => y.id === c.id) ? x.components.map((y) => (y.id === c.id ? c : y)) : [...x.components, c] })); setComp(null); }} />}
      {del && <Confirm title="Hapus catatan?" label="Hapus" body={<>Hapus <b>{del.name}</b>? Revisi proyek akan naik.</>} onClose={() => setDel(null)} onOk={() => up((x) => del.k === 'r' ? { ...x, rooms: x.rooms.filter((r) => r.id !== del.id) } : { ...x, components: x.components.filter((c) => c.id !== del.id), changes: x.changes.map((ch) => (ch.componentId === del.id ? { ...ch, componentId: undefined } : ch)) })} />}
    </div>
  );
}
