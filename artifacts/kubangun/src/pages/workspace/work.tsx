import { useEffect, useMemo, useState } from 'react';
import type { Material, Project, WorkItem, WorkPlan } from '@/lib/types';
import { Badge, Btn, Confirm, Empty, Modal } from '@/components/kit';
import { WorkReport } from '@/components/work-report';
import { uid } from '@/lib/format';
import { blankMaterial, blankWork, calculateMaterial, deleteWork, displayQuantity, getWorkPlan, materialLetter, materialSchedule, meanProgress, orderedRooms, workNumber, workQuantity } from '@/lib/work-plan';
import { ExecutionPanel, parentPct } from './execution';
import { ErrorBox, inBaseline, moveAt, MaterialForm, MaterialList, NameDialog, Sel, TemplateEditor, WorkForm, planFn, roomStateLabel, useSave } from './work-forms';

export { WorkReport };
const move = <T,>(a: T[], i: number, d: number) => { const j = i + d; if (j < 0 || j >= a.length) return a; const n = [...a]; [n[i], n[j]] = [n[j], n[i]]; return n; };

function Schedule({ p, ids, title }: { p: Project; ids?: string[]; title: string }) {
  const plan = getWorkPlan(p); const s = materialSchedule(p, ids);
  return <div className="border border-border bg-card p-3 text-sm" data-testid="panel-schedule"><h3 className="font-display font-bold mb-2">{title}</h3>
    {s.rows.length ? <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-muted-foreground"><th className="py-1">Material</th><th>Total pengadaan</th><th>Kontributor dan asumsi</th></tr></thead><tbody>{s.rows.map((r, i) => <tr key={i} className="border-t border-border align-top"><td className="py-1 pr-2"><b>{r.name}</b><br />{r.specification}</td><td className="font-mono pr-2">{displayQuantity(r.total)} {r.unit}</td><td><ul>{r.contributors.map((c, j) => { const w = plan.items.find((x) => x.id === c.workId); return <li key={j}><span className="font-mono">{w ? workNumber(p, w) : ''}</span> {w?.name}: {displayQuantity(c.quantity)} — <span className="text-muted-foreground">{c.rule}</span></li>; })}</ul></td></tr>)}</tbody></table></div> : <p className="text-muted-foreground text-xs">Tidak ada material yang dapat dijumlahkan.</p>}
    <p className="text-[11px] text-muted-foreground mt-2">1 kuintal = 100 kg, tetapi kg dan kuintal ditampilkan sebagai baris terpisah dan tidak dikonversi atau digabung.</p>
    {s.errors.length > 0 && <div className="mt-2 border border-destructive/40 bg-[hsl(8,60%,94%)] p-2 text-xs" role="alert"><b>Perlu diperbaiki (tidak masuk total):</b><ul className="list-disc ml-4">{s.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}</div>;
}

function WorkCard({ p, w, siblings, onEdit, onAskDelete }: { p: Project; w: WorkItem; siblings: WorkItem[]; onEdit: (w: WorkItem) => void; onAskDelete: (w: WorkItem) => void }) {
  const save = useSave(p.id); const plan = getWorkPlan(p);
  const [mat, setMat] = useState<Material | null>(null); const [delMat, setDelMat] = useState<Material | null>(null);
  const [err, setErr] = useState<string | null>(null); const [open, setOpen] = useState(false);
  let q: number | null = null; let rule = ''; try { const x = workQuantity(p, w); q = x.quantity; rule = x.rule; } catch (e) { rule = (e as Error).message; }
  const idx = siblings.findIndex((s) => s.id === w.id);
  const reorder = (d: number) => setErr(save(planFn((pl) => { const ids = move(siblings.map((s) => s.id), idx, d); let k = 0; return { ...pl, items: pl.items.map((x) => siblings.some((s) => s.id === x.id) ? pl.items.find((y) => y.id === ids[k++])! : x) }; })));
  const putMat = (m: Material) => save(planFn((pl) => ({ ...pl, items: pl.items.map((x) => x.id !== w.id ? x : { ...x, materials: x.materials.some((y) => y.id === m.id) ? x.materials.map((y) => y.id === m.id ? m : y) : [...x.materials, m] }) })));
  const used = (m: Material) => plan.updates.some((u) => u.workId === w.id && u.usage.some((x) => x.materialId === m.id));
  const asTemplate = () => setErr(save(planFn((pl) => ({ ...pl, templates: [...pl.templates, { id: uid(), name: w.name, specification: w.specification, prompts: w.notes, materials: w.materials.map((m) => ({ ...m, id: uid() })) }] })), false));
  return <div id={`work-${w.id}`} className="border border-border bg-card p-3 text-sm scroll-mt-4" data-testid={`card-work-${w.id}`}>
    <div className="flex flex-wrap items-start gap-2"><span className="font-mono text-xs bg-muted px-1.5 py-0.5">{workNumber(p, w)}</span><div className="flex-1 min-w-[10rem]"><b>{w.name}</b>{w.specification && <span className="text-muted-foreground"> — {w.specification}</span>}
      <p className="text-xs font-mono">{q !== null ? `${displayQuantity(q)} ${w.unit}` : 'Kuantitas belum valid'} <span className="text-muted-foreground">· {rule}</span></p>
      {(w.startDate || w.endDate) && <p className="text-xs text-muted-foreground">{w.startDate || '?'} s.d. {w.endDate || '?'}</p>}{w.notes && <p className="text-xs text-muted-foreground">{w.notes}</p>}</div>
      <div className="flex flex-wrap gap-1 no-print"><Btn sm v="ghost" disabled={idx <= 0} aria-label="Naikkan pekerjaan" onClick={() => reorder(-1)}>Naik</Btn><Btn sm v="ghost" disabled={idx >= siblings.length - 1} aria-label="Turunkan pekerjaan" onClick={() => reorder(1)}>Turun</Btn><Btn sm onClick={() => onEdit(w)} data-testid={`button-edit-work-${w.id}`}>Ubah</Btn><Btn sm onClick={asTemplate}>Simpan templat</Btn><Btn sm v="ghost" onClick={() => onAskDelete(w)} data-testid={`button-delete-work-${w.id}`}>Hapus</Btn></div></div>
    <button className="text-xs underline mt-2" onClick={() => setOpen(!open)}>{open ? 'Sembunyikan' : 'Tampilkan'} {w.materials.length} material</button>
    {open && <div className="mt-2 space-y-2">
      {w.materials.map((m, i) => { let line = ''; try { if (q === null) throw new Error('Kuantitas pekerjaan belum valid.'); const c = calculateMaterial(q, w.unit, m); line = `Mentah ${displayQuantity(c.raw)}; pengadaan ${displayQuantity(c.procurement)} ${m.unit}. ${c.rule}`; } catch (e) { line = 'Galat: ' + (e as Error).message; }
        return <p key={m.id} className="text-xs font-mono"><b>{workNumber(p, w)}.{materialLetter(i)} {m.name}</b> — {line}</p>; })}
      <MaterialList materials={w.materials} onReorder={(i, d) => setErr(save(planFn((pl) => ({ ...pl, items: pl.items.map((x) => x.id === w.id ? { ...x, materials: moveAt(x.materials, i, d) } : x) }))))} onAdd={() => setMat(blankMaterial())} onEdit={setMat} onDelete={setDelMat} /></div>}
    <ErrorBox msg={err} />
    {mat && <MaterialForm initial={mat} lockUnit={inBaseline(p, mat.id, true)} ctx={q !== null ? { q, unit: w.unit } : undefined} onClose={() => setMat(null)} onSave={putMat} />}
    {delMat && (used(delMat) ? <Modal title="Material tidak dapat dihapus" onClose={() => setDelMat(null)}><p className="text-sm mb-3">{delMat.name} sudah memiliki catatan penggunaan di riwayat progres. Menghapusnya akan merusak riwayat, jadi dihapus diblokir. Gunakan koreksi progres untuk mengubah penggunaan, atau hapus seluruh pekerjaan beserta riwayatnya.</p><div className="text-right"><Btn onClick={() => setDelMat(null)}>Mengerti</Btn></div></Modal>
      : <Confirm title="Hapus material" body={<p>Hapus {delMat.name} dari {w.name}? {inBaseline(p, delMat.id, true) ? 'Material tetap tercatat sebagai cuplikan di baseline lama (berlabel riwayat) dan baseline ditandai kedaluwarsa.' : ''}</p>} label="Hapus" onClose={() => setDelMat(null)} onOk={() => setErr(save(planFn((pl) => ({ ...pl, items: pl.items.map((x) => x.id !== w.id ? x : { ...x, materials: x.materials.filter((y) => y.id !== delMat.id) }) }))))} />)}
  </div>;
}

export function WorkPlanning({ p }: { p: Project }) {
  const save = useSave(p.id); const plan = getWorkPlan(p);
  const [form, setForm] = useState<{ w: WorkItem; isNew: boolean } | null>(null);
  const [delW, setDelW] = useState<WorkItem | null>(null);
  const [rename, setRename] = useState<string | null>(null);
  const [tpl, setTpl] = useState(false); const [err, setErr] = useState<string | null>(null);
  const [fFloor, setFFloor] = useState(''); const [fRoom, setFRoom] = useState(''); const [fWork, setFWork] = useState('');
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('focus');
    if (!id) return;
    const t = window.setTimeout(() => { const el = document.getElementById('work-' + id); if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('ring-2', 'ring-accent'); window.setTimeout(() => el.classList.remove('ring-2', 'ring-accent'), 2500); } }, 80);
    return () => window.clearTimeout(t);
  }, [p.id]);
  const filterIds = useMemo(() => plan.items.filter((w) => (!fFloor || w.groupId === fFloor) && (!fRoom || w.roomId === fRoom) && (!fWork || w.id === fWork)).map((w) => w.id), [plan, fFloor, fRoom, fWork]);
  const filtered = !!(fFloor || fRoom || fWork);
  const putWork = (w: WorkItem, isNew: boolean) => save(planFn((pl) => ({ ...pl, items: isNew ? [...pl.items, w] : pl.items.map((x) => x.id === w.id ? w : x) } as WorkPlan)));
  const updG = (f: (pl: WorkPlan) => WorkPlan) => setErr(save(planFn((pl) => f(pl))));
  const delImpact = (w: WorkItem) => { const n = plan.updates.filter((u) => u.workId === w.id).length; return `${n} entri progres, entri baseline, dan pemberitahuan terkait akan ikut terhapus.`; };
  const rooftopItems = (id: string) => plan.items.filter((w) => w.groupId === id && !w.roomId);
  return <div className="space-y-6" data-testid="panel-work-planning">
    {plan.startedAt && <p className="text-xs text-muted-foreground">Ringkasan progres memakai rata-rata bobot sama hanya untuk pekerjaan yang tercakup baseline terakhir. Pekerjaan baru yang belum masuk baseline belum memiliki progres dan tidak masuk rata-rata. Nilai bukan bobot teknik atau biaya.</p>}
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-display font-bold text-2xl">Rencana kerja dan material</h2><p className="text-xs text-muted-foreground">Lantai, ruang terukur, pekerjaan, material. Dimensi ruang diubah di halaman Ruang. Koefisien berasal dari Anda, bukan standar bersertifikat.</p></div><Btn onClick={() => setTpl(true)} data-testid="button-templates">Templat</Btn></div>
    <ErrorBox msg={err} />
    {p.mode === 'renovation' && <p className="text-xs border border-border bg-card p-2">Renovasi: pilih ruang terukur secara eksplisit. Klasifikasi ruang (eksisting, usulan, belum diklasifikasi) ditampilkan di setiap ruang dan tidak diubah di sini. Luas ruang dihitung lantai penuh tanpa pengurangan.</p>}
    {plan.groups.map((g, gi) => { const rooms = orderedRooms(p, g.id); const ids = plan.items.filter((w) => w.groupId === g.id).map((w) => w.id);
      return <section key={g.id} className="border border-border bg-card/70" data-testid={`group-${g.id}`}>
        <header className="flex flex-wrap items-center gap-2 px-3 py-2 bg-primary text-primary-foreground"><span className="font-mono text-xs">{gi + 1}</span><h3 className="font-display font-bold text-lg flex-1">{g.name}</h3><span className="text-xs font-mono">Rata-rata bobot sama: {parentPct(plan, ids)}</span>
          <Btn sm v="ghost" className="text-primary-foreground hover:bg-white/10" onClick={() => setRename(g.id)}>Ubah nama</Btn>
          <Btn sm v="ghost" className="text-primary-foreground hover:bg-white/10" disabled={gi === 0} onClick={() => updG((pl) => ({ ...pl, groups: move(pl.groups, gi, -1) }))}>Naik</Btn>
          <Btn sm v="ghost" className="text-primary-foreground hover:bg-white/10" disabled={gi === plan.groups.length - 1} onClick={() => updG((pl) => ({ ...pl, groups: move(pl.groups, gi, 1) }))}>Turun</Btn></header>
        <div className="p-3 space-y-4">
          {g.kind === 'rooftop' && <p className="text-xs text-muted-foreground">Pekerjaan atap langsung di grup ini; masukkan luas atau dimensi permukaan secara eksplisit.</p>}
          {g.kind === 'floor' && !rooms.length && <p className="text-xs text-muted-foreground">Belum ada ruang di lantai ini. Tambahkan ruang di halaman Ruang; pekerjaan lantai wajib memilih ruang.</p>}
          {rooms.map((r, ri) => { const ws = plan.items.filter((w) => w.groupId === g.id && w.roomId === r.id);
            return <div key={r.id} className="border-l-4 border-accent pl-3 space-y-2" data-testid={`room-ref-${r.id}`}>
              <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-mono text-xs">{gi + 1}.{ri + 1}</span><b>{r.name}</b><span className="font-mono text-xs">{r.length} × {r.width} m{r.length > 0 && r.width > 0 ? '' : ' (belum terukur)'}</span><span className="text-xs font-mono text-muted-foreground">Rata-rata ruang (bobot sama): {parentPct(plan, ws.map((x) => x.id))}</span><Badge tone={r.state === 'existing' ? 'ink' : r.state === 'proposed' ? 'accent' : 'warn'}>{roomStateLabel(r.state)}</Badge>
                <span className="ml-auto flex gap-1 no-print"><Btn sm v="ghost" disabled={ri === 0} onClick={() => updG((pl) => ({ ...pl, groups: pl.groups.map((x) => x.id === g.id ? { ...x, roomOrder: move(rooms.map((q) => q.id), ri, -1) } : x) }))}>Naik</Btn><Btn sm v="ghost" disabled={ri === rooms.length - 1} onClick={() => updG((pl) => ({ ...pl, groups: pl.groups.map((x) => x.id === g.id ? { ...x, roomOrder: move(rooms.map((q) => q.id), ri, 1) } : x) }))}>Turun</Btn><Btn sm onClick={() => setForm({ w: blankWork(g.id, r.id), isNew: true })} data-testid={`button-add-work-${r.id}`}>Tambah pekerjaan</Btn></span></div>
              {ws.map((w) => <WorkCard key={w.id} p={p} w={w} siblings={ws} onEdit={(x) => setForm({ w: x, isNew: false })} onAskDelete={setDelW} />)}
              {!ws.length && <p className="text-xs text-muted-foreground">Belum ada pekerjaan di ruang ini.</p>}</div>; })}
          {(g.kind === 'rooftop' || rooftopItems(g.id).length > 0) && <div className="space-y-2">{rooftopItems(g.id).map((w) => <WorkCard key={w.id} p={p} w={w} siblings={rooftopItems(g.id)} onEdit={(x) => setForm({ w: x, isNew: false })} onAskDelete={setDelW} />)}</div>}
          {g.kind === 'rooftop' && <Btn sm onClick={() => setForm({ w: blankWork(g.id), isNew: true })} data-testid={`button-add-direct-${g.id}`}>Tambah pekerjaan rooftop</Btn>}
          {g.kind === 'floor' && rooftopItems(g.id).length > 0 && <p className="text-xs text-destructive">Pekerjaan lantai tanpa ruang tidak valid. Ubah dan pilih ruang untuk setiap pekerjaan di atas.</p>}
          {ids.length > 0 && <Schedule p={p} ids={ids} title={`Jadwal material — ${g.name}`} />}</div></section>; })}
    {!plan.items.length && <Empty title="Belum ada pekerjaan" body="Mulai dengan menambahkan pekerjaan di ruang atau rooftop, atau gunakan templat sebagai titik awal." />}
    <section className="space-y-2"><h3 className="font-display font-bold text-xl">Jadwal material proyek</h3>
      <div className="grid sm:grid-cols-3 gap-2 no-print"><Sel value={fFloor} onChange={(v) => { setFFloor(v); setFRoom(''); setFWork(''); }} options={[{ value: '', label: 'Semua lantai/grup' }, ...plan.groups.map((g) => ({ value: g.id, label: g.name }))]} testid="filter-floor" />
        <Sel value={fRoom} onChange={(v) => { setFRoom(v); setFWork(''); }} options={[{ value: '', label: 'Semua ruang' }, ...p.rooms.filter((r) => !fFloor || plan.groups.find((g) => g.id === fFloor)?.floor === r.floor).map((r) => ({ value: r.id, label: r.name }))]} testid="filter-room" />
        <Sel value={fWork} onChange={setFWork} options={[{ value: '', label: 'Semua pekerjaan' }, ...plan.items.filter((w) => (!fFloor || w.groupId === fFloor) && (!fRoom || w.roomId === fRoom)).map((w) => ({ value: w.id, label: `${workNumber(p, w)} ${w.name}` }))]} testid="filter-work" /></div>
      <Schedule p={p} ids={filterIds} title={filtered ? 'Jadwal terfilter' : 'Semua pekerjaan'} /></section>
    <ExecutionPanel p={p} />
    {form && <WorkForm p={p} initial={form.w} isNew={form.isNew} onClose={() => setForm(null)} onSave={(w) => putWork(w, form.isNew)} />}
    {delW && <Confirm title="Hapus pekerjaan" label="Hapus pekerjaan" onClose={() => setDelW(null)} onOk={() => setErr(save((x) => deleteWork(x, [delW.id])))} body={<div className="space-y-2"><p>Hapus <b>{delW.name}</b> beserta material-nya?</p><p className="text-destructive">{delImpact(delW)} Tindakan ini tidak dapat dibatalkan.</p></div>} />}
    {rename && <NameDialog title="Ubah nama grup" initial={plan.groups.find((g) => g.id === rename)?.name ?? ''} onClose={() => setRename(null)} onSubmit={(n) => save(planFn((pl) => ({ ...pl, groups: pl.groups.map((g) => g.id === rename ? { ...g, name: n } : g) })))} />}
    {tpl && <TemplateEditor p={p} onClose={() => setTpl(false)} />}
  </div>;
}
