import { useState, type ReactNode } from 'react';
import type { Material, Project, QuantityUnit, WorkItem, WorkPlan, WorkTemplate } from '@/lib/types';
import { useStore } from '@/lib/store';
import { Btn, Field, Modal, inputCls } from '@/components/kit';
import { numOrNull, uid } from '@/lib/format';
import { UNITS, applyTemplate, blankMaterial, calculateMaterial, displayQuantity, getWorkPlan, workQuantity } from '@/lib/work-plan';

export function useSave(pid: string) {
  const { updateProject } = useStore();
  return (fn: (p: Project) => Project, bump = true): string | null => {
    try { return updateProject(pid, fn, bump) ? null : 'Penyimpanan ke perangkat gagal. Data di formulir tetap ada; periksa ruang penyimpanan lalu coba lagi.'; }
    catch (e) { return (e as Error).message; }
  };
}
export const planFn = (f: (pl: WorkPlan, p: Project) => WorkPlan) => (p: Project): Project => ({ ...p, workPlan: f(getWorkPlan(p), p) });
export function ErrorBox({ msg }: { msg: string | null }) {
  return msg ? <div role="alert" data-testid="text-form-error" className="border border-destructive/50 bg-[hsl(8,60%,92%)] text-[hsl(8,68%,28%)] text-sm px-3 py-2">{msg}</div> : null;
}
export function Sel<T extends string>({ value, onChange, options, testid }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; disabled?: boolean }[]; testid?: string }) {
  return <select aria-label={testid === 'filter-floor' ? 'Filter lantai atau kelompok' : testid === 'filter-room' ? 'Filter ruang' : testid === 'filter-work' ? 'Filter pekerjaan' : undefined} data-testid={testid} className={inputCls} value={value} onChange={(e) => onChange(e.target.value as T)}>{options.map((o) => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}</select>;
}
const unitOpts = UNITS.map((u) => ({ value: u, label: u === 'kuintal' ? 'kuintal (1 kuintal = 100 kg)' : u }));
export const inBaseline = (p: Project, id: string, material = false) => getWorkPlan(p).baselines.some((b) => b.items.some((i) => material ? i.materials.some((m) => m.material.id === id) : i.work.id === id));
const parse = (label: string, s: string): number | null => {
  if (s.trim() === '') return null;
  const n = numOrNull(s); if (n === null) throw new Error(`${label}: "${s}" bukan angka yang valid.`); return n;
};
export const moveAt = <T,>(a: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= a.length) return a; const n = [...a]; [n[i], n[j]] = [n[j], n[i]]; return n; };
const COUNT = ['lembar', 'buah', 'dus'];
function draftCheck(m: Material): { errors: string[]; warnings: string[] } {
  const errors: string[] = []; const warnings: string[] = [];
  const pos = (n: number | null | undefined) => n != null && Number.isFinite(n) && n > 0;
  if (!(Number.isFinite(m.waste) && m.waste >= 0)) errors.push('Susut minimal 0%.');
  if (m.packageSize !== null && !pos(m.packageSize)) errors.push('Kelipatan pembulatan harus lebih dari 0.');
  if (m.packageSize !== null && COUNT.includes(m.unit) && !Number.isInteger(m.packageSize)) errors.push('Kelipatan untuk lembar/buah/dus harus bilangan bulat.');
  if (m.factor !== null && !pos(m.factor)) errors.push('Faktor harus lebih dari 0 bila diisi.');
  if (m.manualQuantity !== null && m.manualQuantity < 0) errors.push('Jumlah manual minimal 0.');
  if (m.boxContents != null && !pos(m.boxContents)) errors.push('Isi dus harus lebih dari 0 bila diisi.');
  if (m.overrideQuantity !== null && (m.overrideQuantity < 0 || !m.overrideReason.trim())) errors.push('Override memerlukan jumlah minimal 0 dan alasan.');
  if (m.mode === 'manual' && m.manualQuantity === null) warnings.push('Jumlah manual belum diisi; wajib diisi sebelum dipakai pada pekerjaan.');
  if (m.mode !== 'manual' && m.factor === null) warnings.push('Konsumsi/cakupan belum diisi; wajib diisi sebelum dipakai pada pekerjaan.');
  if (m.unit === 'dus' && m.mode !== 'coverage' && !(m.mode === 'manual' && pos(m.factor)) && !(pos(m.boxContents) && m.boxContentsUnit && m.boxContentsUnit !== 'dus')) warnings.push('Dus memerlukan cakupan manual positif atau isi dus eksplisit (bukan dus).');
  return { errors, warnings };
}
export const roomStateLabel = (s?: string) => s === 'existing' ? 'Eksisting' : s === 'proposed' ? 'Usulan' : 'Belum diklasifikasi';
const str = (n: number | null) => n === null ? '' : String(n);

export function MaterialForm({ initial, ctx, lockUnit, onSave, onClose }: { initial: Material; lockUnit?: boolean; ctx?: { q: number; unit: QuantityUnit }; onSave: (m: Material) => string | null; onClose: () => void }) {
  const [m, setM] = useState({ ...initial });
  const [t, setT] = useState({ factor: str(initial.factor), waste: String(initial.waste), pkg: str(initial.packageSize), manual: str(initial.manualQuantity), ovr: str(initial.overrideQuantity), box: str(initial.boxContents ?? null) });
  const [err, setErr] = useState<string | null>(null);
  const build = (): Material => {
    if (!m.name.trim()) throw new Error('Nama material wajib diisi.');
    const dus = m.unit === 'dus';
    return { ...m, name: m.name.trim(), factor: m.mode === 'manual' && !dus ? null : parse('Faktor', t.factor), boxContents: dus ? parse('Isi dus', t.box) : null, boxContentsUnit: dus ? (m.boxContentsUnit ?? 'buah') : undefined, waste: parse('Susut', t.waste) ?? 0, packageSize: parse('Isi kemasan', t.pkg), manualQuantity: m.mode === 'manual' ? parse('Jumlah manual', t.manual) : null, overrideQuantity: parse('Override', t.ovr), overrideReason: m.overrideReason };
  };
  let preview: string; let warns: string[] = [];
  try { const mm = build(); if (!ctx) { const d = draftCheck(mm); warns = d.warnings; if (d.errors.length) throw new Error(d.errors.join(' ')); preview = 'Draf templat' + (d.warnings.length ? '' : ' lengkap') + '.'; } else { const c = calculateMaterial(ctx.q, ctx.unit, mm); preview = `Mentah ${displayQuantity(c.raw)} ${c.unit}; pengadaan ${displayQuantity(c.procurement)} ${c.unit}. Aturan: ${c.rule}`; } }
  catch (e) { preview = 'Belum valid: ' + (e as Error).message; }
  const submit = () => { try { const mm = build(); if (ctx) calculateMaterial(ctx.q, ctx.unit, mm); else { const d = draftCheck(mm); if (d.errors.length) throw new Error(d.errors.join(' ')); } const r = onSave(mm); if (r) setErr(r); else onClose(); } catch (e) { setErr((e as Error).message); } };
  const rate = m.mode === 'rate';
  return <Modal wide title={initial.name ? 'Ubah material' : 'Tambah material'} onClose={onClose}><div className="space-y-3">
    <p className="text-xs text-muted-foreground">Koefisien adalah angka dari sumber Anda sendiri; KuBangun tidak menyediakan koefisien baku.</p>
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="Nama"><input data-testid="input-material-name" className={inputCls} value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} /></Field>
      <Field label="Spesifikasi"><input className={inputCls} value={m.specification} onChange={(e) => setM({ ...m, specification: e.target.value })} /></Field>
      <Field label="Satuan pengadaan" hint={lockUnit ? 'Terkunci: material ini sudah ada di baseline.' : 'kg dan kuintal dijumlahkan terpisah; tidak ada konversi otomatis.'}><select className={inputCls} disabled={lockUnit} value={m.unit} onChange={(e) => setM({ ...m, unit: e.target.value as QuantityUnit })}>{unitOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
      <Field label="Mode"><Sel value={m.mode} onChange={(mode) => setM({ ...m, mode })} options={[{ value: 'manual', label: 'Manual (jumlah langsung)' }, { value: 'rate', label: 'Konsumsi per satuan kerja' }, { value: 'coverage', label: 'Cakupan per lembar/buah/dus' }]} /></Field>
      {m.mode === 'manual' && m.unit === 'dus' && <Field label={`Cakupan manual per dus (${m.basisUnit}/dus, opsional)`} hint="Faktor manual = cakupan per dus. Dus manual wajib cakupan positif ATAU isi dus eksplisit di bawah."><input className={inputCls} inputMode="decimal" value={t.factor} onChange={(e) => setT({ ...t, factor: e.target.value })} /></Field>}
      {m.mode === 'manual' && <Field label={`Jumlah manual (${m.unit})`} hint="Susut tidak diterapkan pada mode manual."><input className={inputCls} inputMode="decimal" value={t.manual} onChange={(e) => setT({ ...t, manual: e.target.value })} /></Field>}
      {m.mode !== 'manual' && <>
        <Field label={rate ? `Konsumsi ${m.unit} per ${m.basisUnit}` : `Cakupan ${m.basisUnit} per ${m.unit}`}><input data-testid="input-material-factor" className={inputCls} inputMode="decimal" value={t.factor} onChange={(e) => setT({ ...t, factor: e.target.value })} /></Field>
        <Field label="Satuan dasar kerja" hint="Harus sama dengan satuan pekerjaan."><Sel value={m.basisUnit} onChange={(basisUnit) => setM({ ...m, basisUnit })} options={unitOpts} /></Field>
        <Field label="Susut (%)"><input className={inputCls} inputMode="decimal" value={t.waste} onChange={(e) => setT({ ...t, waste: e.target.value })} /></Field></>}
      {m.unit === 'dus' && <><Field label="Isi dus (jumlah, opsional)" hint="Dengan satuan isi di samping; isi dus bukan kelipatan pembulatan."><input data-testid="input-box-contents" className={inputCls} inputMode="decimal" value={t.box} onChange={(e) => setT({ ...t, box: e.target.value })} /></Field><Field label="Satuan isi dus"><select className={inputCls} value={m.boxContentsUnit ?? 'buah'} onChange={(e) => setM({ ...m, boxContentsUnit: e.target.value as QuantityUnit })}>{unitOpts.filter((o) => o.value !== 'dus').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field></>}
      {m.mode === 'manual' && m.unit === 'dus' && <Field label="Satuan dasar cakupan"><Sel value={m.basisUnit} onChange={(basisUnit) => setM({ ...m, basisUnit })} options={unitOpts} /></Field>}
      <Field label={`Kelipatan pembulatan pengadaan (${m.unit}, opsional)`} hint={m.unit === 'dus' ? 'Ini kelipatan pembulatan, bukan isi dus. Isi/cakupan dus diisi pada faktor (mode cakupan) atau faktor manual; dus manual wajib faktor positif atau kelipatan.' : 'Pengadaan dibulatkan ke kelipatan ini (berlaku untuk semua satuan; lembar/buah/dus harus bilangan bulat).'}><input className={inputCls} inputMode="decimal" value={t.pkg} onChange={(e) => setT({ ...t, pkg: e.target.value })} /></Field>
      <Field label="Override pengadaan (opsional)" hint="Sertakan alasan tertulis."><input className={inputCls} inputMode="decimal" value={t.ovr} onChange={(e) => setT({ ...t, ovr: e.target.value })} /></Field>
      <Field label="Alasan override"><input className={inputCls} value={m.overrideReason} onChange={(e) => setM({ ...m, overrideReason: e.target.value })} /></Field>
    </div>
    <div className="text-xs font-mono bg-muted/60 border border-border p-2 break-words" data-testid="text-material-preview">{preview}</div>
    {warns.length > 0 && <ul className="text-xs border border-[hsl(38,70%,40%)] bg-[hsl(45,85%,88%)] p-2 list-disc pl-5" data-testid="warn-material-draft">{warns.map((x) => <li key={x}>{x}</li>)}</ul>}
    <ErrorBox msg={err} />
    <div className="flex justify-end gap-2"><Btn onClick={onClose}>Batal</Btn><Btn v="primary" onClick={submit} data-testid="button-save-material">Simpan material</Btn></div>
  </div></Modal>;
}

export function MaterialList({ materials, onEdit, onDelete, onAdd, onReorder }: { onReorder?: (index: number, dir: number) => void; materials: Material[]; onEdit: (m: Material) => void; onDelete: (m: Material) => void; onAdd: () => void }) {
  return <div className="space-y-1">
    {materials.map((m, i) => <div key={m.id} className="flex items-center gap-2 text-sm border border-border bg-card px-2 py-1.5"><div className="flex-1 min-w-0"><b>{m.name}</b> <span className="text-muted-foreground">{m.unit} · {m.mode}{m.overrideQuantity !== null ? ' · override' : ''}</span></div>{onReorder && <><Btn sm v="ghost" disabled={i === 0} onClick={() => onReorder(i, -1)}>Naik</Btn><Btn sm v="ghost" disabled={i === materials.length - 1} onClick={() => onReorder(i, 1)}>Turun</Btn></>}<Btn sm onClick={() => onEdit(m)}>Ubah</Btn><Btn sm v="ghost" onClick={() => onDelete(m)}>Hapus</Btn></div>)}
    <Btn sm onClick={onAdd} data-testid="button-add-material">Tambah material</Btn></div>;
}

export function WorkForm({ p, initial, isNew, onSave, onClose }: { p: Project; initial: WorkItem; isNew: boolean; onSave: (w: WorkItem) => string | null; onClose: () => void }) {
  const plan = getWorkPlan(p);
  const [w, setW] = useState(initial);
  const [t, setT] = useState({ q: str(initial.quantity), l: str(initial.length), wd: str(initial.width) });
  const [err, setErr] = useState<string | null>(null);
  const group = plan.groups.find((g) => g.id === w.groupId);
  const rooms = group?.kind === 'floor' ? p.rooms.filter((r) => r.floor === group.floor) : [];
  const build = (): WorkItem => {
    if (!w.name.trim()) throw new Error('Nama pekerjaan wajib diisi.');
    if (w.startDate && !Number.isFinite(Date.parse(w.startDate))) throw new Error('Tanggal mulai tidak valid.');
    if (w.endDate && !Number.isFinite(Date.parse(w.endDate))) throw new Error('Tanggal selesai tidak valid.');
    if (w.startDate && w.endDate && w.endDate < w.startDate) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    const rooftop = group?.kind === 'rooftop';
    const out: WorkItem = { ...w, roomId: rooftop ? undefined : w.roomId, basis: rooftop && w.basis === 'room-area' ? 'explicit-area' : w.basis, name: w.name.trim(), quantity: w.basis === 'room-area' ? null : parse('Kuantitas', t.q), length: w.basis === 'explicit-area' ? parse('Panjang', t.l) : null, width: w.basis === 'explicit-area' ? parse('Lebar', t.wd) : null };
    if (group?.kind === 'floor' && !out.roomId) throw new Error('Pekerjaan lantai wajib memilih ruang. Tambahkan atau ukur ruang di halaman Ruang; hanya Rooftop yang boleh langsung.');
    if (out.basis === 'room-area' && !out.roomId) throw new Error('Pilih ruang terukur untuk basis luas ruang.');
    if (!isNew && inBaseline(p, initial.id) && out.unit !== initial.unit) throw new Error('Satuan tidak dapat diubah saat pelaksanaan berjalan karena riwayat progres memakai satuan lama. Hapus pekerjaan (dengan konsekuensi riwayat) lalu buat ulang.');
    workQuantity(p, out); return out;
  };
  let calc: string;
  try { const x = workQuantity(p, build()); calc = `${displayQuantity(x.quantity)} ${w.unit} — ${x.rule}`; } catch (e) { calc = 'Belum valid: ' + (e as Error).message; }
  const submit = () => { try { const r = onSave(build()); if (r) setErr(r); else onClose(); } catch (e) { setErr((e as Error).message); } };
  const set = <K extends keyof WorkItem>(k: K, v: WorkItem[K]) => setW((x) => ({ ...x, [k]: v }));
  return <Modal wide title={isNew ? 'Tambah pekerjaan' : 'Ubah pekerjaan'} onClose={onClose}><div className="space-y-3">
    {isNew && plan.templates.length > 0 && <Field label="Mulai dari templat (salinan independen)"><select data-testid="select-template" className={inputCls} value="" onChange={(e) => { const tp = plan.templates.find((x) => x.id === e.target.value); if (tp) setW((x) => applyTemplate(x, tp)); }}><option value="">Pilih templat…</option>{plan.templates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>}
    {w.templateName && w.notes && isNew && <p className="text-xs bg-muted/60 border border-border p-2">Petunjuk templat: {w.notes}</p>}
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="Nama pekerjaan" className="sm:col-span-2"><input data-testid="input-work-name" className={inputCls} value={w.name} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Spesifikasi" className="sm:col-span-2"><input className={inputCls} value={w.specification} onChange={(e) => set('specification', e.target.value)} /></Field>
      <Field label="Kelompok"><Sel value={w.groupId} onChange={(g) => setW((x) => ({ ...x, groupId: g, roomId: undefined, basis: x.basis === 'room-area' ? 'explicit-area' : x.basis }))} options={plan.groups.map((g) => ({ value: g.id, label: g.name }))} /></Field>
      <Field label="Ruang terukur" hint={group?.kind === 'rooftop' ? 'Rooftop tidak memiliki ruang.' : 'Wajib. Klasifikasi ruang ditampilkan; dimensi diubah di halaman Ruang.'}><Sel value={w.roomId ?? ''} onChange={(v) => set('roomId', v || undefined)} options={group?.kind === 'rooftop' ? [{ value: '', label: 'Rooftop: tanpa ruang' }] : [{ value: '', label: 'Pilih ruang…', disabled: true }, ...rooms.map((r) => ({ value: r.id, label: `${r.name} — ${r.length}×${r.width} m — ${roomStateLabel(r.state)}`, disabled: w.basis === 'room-area' && !(r.length > 0 && r.width > 0) }))]} /></Field>
      <Field label="Dasar kuantitas"><Sel value={w.basis} onChange={(b) => set('basis', b)} options={[{ value: 'room-area', label: 'Luas ruang (lantai penuh)', disabled: !w.roomId || group?.kind === 'rooftop' }, { value: 'explicit-area', label: 'Luas/dimensi eksplisit' }, { value: 'manual', label: 'Kuantitas manual' }]} /></Field>
      <Field label="Satuan" hint={!isNew && inBaseline(p, initial.id) ? 'Terkunci: pekerjaan sudah ada di baseline.' : undefined}><select data-testid="select-work-unit" className={inputCls} disabled={!isNew && inBaseline(p, initial.id)} value={w.unit} onChange={(e) => set('unit', e.target.value as QuantityUnit)}>{unitOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
      {w.basis === 'explicit-area' && <><Field label="Panjang (m, opsional)"><input className={inputCls} inputMode="decimal" value={t.l} onChange={(e) => setT({ ...t, l: e.target.value })} /></Field><Field label="Lebar (m, opsional)"><input className={inputCls} inputMode="decimal" value={t.wd} onChange={(e) => setT({ ...t, wd: e.target.value })} /></Field></>}
      {w.basis !== 'room-area' && <Field label={`Kuantitas rencana (${w.unit})`} hint={w.basis === 'explicit-area' ? 'Dipakai bila panjang dan lebar kosong.' : undefined}><input data-testid="input-work-qty" className={inputCls} inputMode="decimal" value={t.q} onChange={(e) => setT({ ...t, q: e.target.value })} /></Field>}
      <Field label="Tanggal mulai"><input type="date" className={inputCls} value={w.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
      <Field label="Tanggal selesai"><input type="date" className={inputCls} value={w.endDate} onChange={(e) => set('endDate', e.target.value)} /></Field>
      <Field label="Catatan" className="sm:col-span-2"><textarea className={inputCls} rows={2} value={w.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
    </div>
    <div className="text-xs font-mono bg-muted/60 border border-border p-2 break-words" data-testid="text-work-calc">Kuantitas: {calc}</div>
    <ErrorBox msg={err} />
    <div className="flex justify-end gap-2"><Btn onClick={onClose}>Batal</Btn><Btn v="primary" onClick={submit} data-testid="button-save-work">Simpan pekerjaan</Btn></div>
  </div></Modal>;
}

export function ReasonDialog({ title, label, cta, body, onSubmit, onClose }: { title: string; label: string; cta: string; body?: ReactNode; onSubmit: (reason: string) => string | null; onClose: () => void }) {
  const [v, setV] = useState(''); const [err, setErr] = useState<string | null>(null);
  return <Modal title={title} onClose={onClose}><div className="space-y-3 text-sm">{body}<Field label={label}><textarea data-testid="input-reason" className={inputCls} rows={3} value={v} onChange={(e) => setV(e.target.value)} /></Field><ErrorBox msg={err} />
    <div className="flex justify-end gap-2"><Btn onClick={onClose}>Batal</Btn><Btn v="primary" data-testid="button-submit-reason" onClick={() => { if (!v.trim()) { setErr('Alasan wajib diisi.'); return; } const r = onSubmit(v.trim()); if (r) setErr(r); else onClose(); }}>{cta}</Btn></div></div></Modal>;
}

export function NameDialog({ title, initial, onSubmit, onClose }: { title: string; initial: string; onSubmit: (n: string) => string | null; onClose: () => void }) {
  const [v, setV] = useState(initial); const [err, setErr] = useState<string | null>(null);
  return <Modal title={title} onClose={onClose}><div className="space-y-3"><Field label="Nama"><input data-testid="input-name" className={inputCls} value={v} onChange={(e) => setV(e.target.value)} /></Field><ErrorBox msg={err} />
    <div className="flex justify-end gap-2"><Btn onClick={onClose}>Batal</Btn><Btn v="primary" onClick={() => { if (!v.trim()) { setErr('Nama wajib diisi.'); return; } const r = onSubmit(v.trim()); if (r) setErr(r); else onClose(); }}>Simpan</Btn></div></div></Modal>;
}

export function TemplateEditor({ p, onClose }: { p: Project; onClose: () => void }) {
  const save = useSave(p.id); const plan = getWorkPlan(p);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorkTemplate | null>(null);
  const [mat, setMat] = useState<Material | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const open = (t: WorkTemplate) => { setSel(t.id); setDraft(structuredClone(t)); setErr(null); };
  const upsert = (t: WorkTemplate) => save(planFn((pl) => ({ ...pl, templates: pl.templates.some((x) => x.id === t.id) ? pl.templates.map((x) => x.id === t.id ? t : x) : [...pl.templates, t] })), false);
  return <Modal wide title="Templat pekerjaan proyek" onClose={onClose}><div className="space-y-3 text-sm">
    <p className="text-xs text-muted-foreground">Templat tersimpan hanya di proyek ini. Menerapkan templat membuat salinan independen; mengubah templat tidak mengubah pekerjaan yang ada.</p>
    {!draft && <div className="space-y-1">{plan.templates.map((t) => <div key={t.id} className="flex items-center gap-2 border border-border px-2 py-1.5 bg-card"><span className="flex-1">{t.name} <span className="text-muted-foreground">({t.materials.length} material)</span></span><Btn sm onClick={() => open(t)}>Ubah</Btn><Btn sm v="ghost" onClick={() => { const r = upsert({ ...structuredClone(t), id: uid(), name: t.name + ' (salinan)', materials: t.materials.map((m) => ({ ...m, id: uid() })) }); setErr(r); }}>Duplikat</Btn><Btn sm v="ghost" onClick={() => setErr(save(planFn((pl) => ({ ...pl, templates: pl.templates.filter((x) => x.id !== t.id) })), false))}>Hapus</Btn></div>)}
      {!plan.templates.length && <p className="text-muted-foreground">Belum ada templat.</p>}
      <Btn sm onClick={() => open({ id: uid(), name: '', specification: '', prompts: '', materials: [] })} data-testid="button-new-template">Templat baru</Btn></div>}
    {draft && <div className="space-y-3">
      <Field label="Nama templat"><input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
      <Field label="Spesifikasi"><input className={inputCls} value={draft.specification} onChange={(e) => setDraft({ ...draft, specification: e.target.value })} /></Field>
      <Field label="Petunjuk pengisian (prompts)"><textarea className={inputCls} rows={3} value={draft.prompts} onChange={(e) => setDraft({ ...draft, prompts: e.target.value })} /></Field>
      <MaterialList materials={draft.materials} onReorder={(i, d) => setDraft({ ...draft, materials: moveAt(draft.materials, i, d) })} onAdd={() => setMat(blankMaterial())} onEdit={setMat} onDelete={(m) => setDraft({ ...draft, materials: draft.materials.filter((x) => x.id !== m.id) })} />
      <ErrorBox msg={err} />
      <div className="flex justify-end gap-2"><Btn onClick={() => { setDraft(null); setSel(null); }}>Kembali</Btn><Btn v="primary" onClick={() => { if (!draft.name.trim()) { setErr('Nama templat wajib diisi.'); return; } const r = upsert({ ...draft, name: draft.name.trim() }); if (r) setErr(r); else { setDraft(null); setSel(null); setErr(null); } }}>Simpan templat</Btn></div>
      {mat && sel && <MaterialForm initial={mat} onClose={() => setMat(null)} onSave={(m) => { setDraft((d) => d && ({ ...d, materials: d.materials.some((x) => x.id === m.id) ? d.materials.map((x) => x.id === m.id ? m : x) : [...d.materials, m] })); return null; }} />}
    </div>}
    {!draft && <ErrorBox msg={err} />}
  </div></Modal>;
}
