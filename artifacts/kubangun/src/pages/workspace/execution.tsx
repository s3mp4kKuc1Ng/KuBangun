import { useState } from 'react';
import type { Project, WorkItem, WorkStatus, WorkUpdate } from '@/lib/types';
import { Badge, Btn, Empty, Field, Modal, inputCls } from '@/components/kit';
import { fmtDate, fmtDateTime, numOrNull } from '@/lib/format';
import { STATUS_LABEL, baselineOutdated, displayQuantity, getWorkPlan, latestUpdate, meanProgress, orderedRooms, recordProgress, startExecution, workNumber, workProgress, workQuantity } from '@/lib/work-plan';
import { ErrorBox, ReasonDialog, Sel, useSave } from './work-forms';

export const parentPct = (plan: ReturnType<typeof getWorkPlan>, ids: string[]) => ids.length ? pct(meanProgress(plan, ids)) : 'Tidak ada pekerjaan';
const pct = (n: number | null) => n === null ? 'Belum ada' : `${n.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
const statusTone = (s: WorkStatus) => s === 'completed' ? 'ok' : s === 'blocked' ? 'bad' : s === 'in-progress' ? 'accent' : 'muted';

export function ProgressForm({ p, workId, onClose }: { p: Project; workId: string; onClose: () => void }) {
  const save = useSave(p.id); const plan = getWorkPlan(p);
  const b = plan.baselines.at(-1); const bi = b?.items.find((i) => i.work.id === workId);
  const last = latestUpdate(plan, workId);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<WorkStatus>(last?.status ?? 'in-progress');
  const [done, setDone] = useState(last ? String(last.completedQuantity) : '0');
  const [who, setWho] = useState(last?.responsible ?? '');
  const [note, setNote] = useState('');
  const [use, setUse] = useState<Record<string, string>>(Object.fromEntries((last?.usage ?? []).map((u) => [u.materialId, String(u.quantity)])));
  const [err, setErr] = useState<string | null>(null);
  if (!bi) return <Modal title="Catat progres" onClose={onClose}><p className="text-sm">Pekerjaan ini belum masuk baseline.</p></Modal>;
  const submit = () => {
    const usage: { materialId: string; quantity: number }[] = [];
    for (const m of bi.materials) { const s = use[m.material.id] ?? ''; if (s.trim() === '') continue; const n = numOrNull(s); if (n === null) { setErr(`Penggunaan ${m.material.name}: "${s}" bukan angka valid.`); return; } usage.push({ materialId: m.material.id, quantity: n }); }
    const cq = numOrNull(done); if (cq === null) { setErr('Kuantitas selesai harus berupa angka.'); return; }
    const r = save((x) => recordProgress(x, { workId, date, status, completedQuantity: cq, responsible: who.trim(), note, usage }));
    if (r) setErr(r); else onClose();
  };
  return <Modal wide title={`Catat progres — ${bi.work.name}`} onClose={onClose}><div className="space-y-3 text-sm">
    <p className="text-xs text-muted-foreground">Nilai bersifat kumulatif. Setiap simpan menambah entri baru; entri lama tidak diubah, sehingga koreksi tetap tercatat. Penggunaan material juga kumulatif sejak awal (bukan tambahan hari ini); kosong berarti belum dicatat, bukan nol.</p>
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="Tanggal"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Status"><Sel value={status} onChange={(s) => setStatus(s as WorkStatus)} options={(Object.keys(STATUS_LABEL) as WorkStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))} /></Field>
      <Field label={`Selesai kumulatif (${bi.work.unit})`} hint={`Baseline ${displayQuantity(bi.quantity)} ${bi.work.unit}`}><input data-testid="input-completed" className={inputCls} inputMode="decimal" value={done} onChange={(e) => setDone(e.target.value)} /></Field>
      <Field label="Penanggung jawab"><input className={inputCls} value={who} onChange={(e) => setWho(e.target.value)} /></Field>
    </div>
    {bi.materials.length > 0 && <div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Penggunaan material kumulatif</p>
      <div className="grid sm:grid-cols-2 gap-2">{bi.materials.map((m) => <Field key={m.material.id} label={`${m.material.name} (${m.material.unit})`} hint={`Pengadaan baseline ${displayQuantity(m.procurement)}`}><input className={inputCls} inputMode="decimal" placeholder="Belum dicatat" value={use[m.material.id] ?? ''} onChange={(e) => setUse({ ...use, [m.material.id]: e.target.value })} /></Field>)}</div></div>}
    <Field label="Catatan atau alasan koreksi (wajib)"><textarea data-testid="input-progress-note" className={inputCls} rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    <ErrorBox msg={err} />
    <div className="flex justify-end gap-2"><Btn onClick={onClose}>Batal</Btn><Btn v="primary" onClick={submit} data-testid="button-save-progress">Simpan entri</Btn></div>
  </div></Modal>;
}

export function UpdateRow({ u, p }: { u: WorkUpdate; p: Project }) {
  const plan = getWorkPlan(p); const bl = plan.baselines.find((b) => b.id === u.baselineId); const bi = bl?.items.find((i) => i.work.id === u.workId);
  return <li className="border border-border bg-card p-2 text-sm"><div className="flex flex-wrap gap-2 items-center"><b>{fmtDate(u.date)}</b><Badge tone={statusTone(u.status)}>{STATUS_LABEL[u.status]}</Badge><span className="font-mono text-xs">{displayQuantity(u.completedQuantity)} {bi?.work.unit}</span>{u.responsible && <span className="text-muted-foreground">oleh {u.responsible}</span>}<span className="text-xs text-muted-foreground ml-auto">dicatat {fmtDateTime(u.createdAt)}</span></div>
    <p className="mt-1">{u.note}</p>
    {bi && bi.materials.length > 0 && <p className="text-xs text-muted-foreground mt-1">Material: {bi.materials.map((m) => { const x = u.usage.find((y) => y.materialId === m.material.id); return `${m.material.name} ${x ? displayQuantity(x.quantity) + ' ' + m.material.unit : 'belum dicatat'}`; }).join('; ')}</p>}</li>;
}

function History({ p, work, onClose }: { p: Project; work: WorkItem; onClose: () => void }) {
  const ups = getWorkPlan(p).updates.filter((u) => u.workId === work.id).reverse();
  return <Modal wide title={`Riwayat — ${work.name}`} onClose={onClose}>{ups.length ? <ul className="space-y-2">{ups.map((u) => <UpdateRow key={u.id} u={u} p={p} />)}</ul> : <p className="text-sm text-muted-foreground">Belum ada entri progres.</p>}</Modal>;
}

export function ExecutionPanel({ p }: { p: Project }) {
  const save = useSave(p.id); const plan = getWorkPlan(p);
  const [dlg, setDlg] = useState<'start' | 'rebase' | null>(null);
  const [prog, setProg] = useState<string | null>(null); const [hist, setHist] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const outdated = baselineOutdated(p); const base = plan.baselines.at(-1);
  const all = plan.items.map((w) => w.id);
  if (!plan.startedAt || !base) return <section className="border border-border bg-card p-4 space-y-2" data-testid="panel-execution">
    <h2 className="font-display font-bold text-xl">Pelaksanaan</h2>
    <p className="text-sm text-muted-foreground">Rencana belum dimulai. Memulai pelaksanaan menyimpan baseline kuantitas dan material; progres dicatat terhadap baseline itu. Pekerjaan tetap dapat diubah, tetapi perubahan akan menandai baseline kedaluwarsa.</p>
    <ErrorBox msg={err} />
    <Btn v="accent" disabled={!plan.items.length} onClick={() => setDlg('start')} data-testid="button-start-execution">Mulai pelaksanaan</Btn>
    {!plan.items.length && <p className="text-xs text-muted-foreground">Tambahkan minimal satu pekerjaan terlebih dahulu.</p>}
    {dlg === 'start' && <ReasonDialog title="Mulai pelaksanaan" label="Catatan baseline awal" cta="Mulai dan simpan baseline" onClose={() => setDlg(null)} onSubmit={(r) => save((x) => startExecution(x, r))} />}
  </section>;
  return <section className="space-y-4" data-testid="panel-execution">
    <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="font-display font-bold text-xl">Pelaksanaan</h2><p className="text-xs text-muted-foreground">Dimulai {fmtDateTime(plan.startedAt)} · {plan.baselines.length} baseline</p></div>
      <Btn onClick={() => setDlg('rebase')} data-testid="button-rebaseline">Simpan baseline baru</Btn></div>
    {outdated && <div role="alert" data-testid="warn-baseline-outdated" className="border border-[hsl(38,70%,40%)] bg-[hsl(45,85%,88%)] px-3 py-2 text-sm">Baseline kedaluwarsa: rencana saat ini berbeda dari baseline terakhir. Pencatatan progres diblokir sampai Anda menyimpan baseline baru dengan alasan.</div>}
    <div className="border border-border bg-card p-3 text-sm"><b>Rata-rata progres pekerjaan (bobot sama): {pct(meanProgress(plan, all))}</b>
      <p className="text-xs text-muted-foreground">Setiap pekerjaan berbobot sama. Ini bukan bobot teknik atau biaya, dan bukan penilaian mutu. Kelompok tanpa pekerjaan tidak memiliki progres.</p>
      <ul className="mt-2 grid sm:grid-cols-2 gap-1 text-xs">{plan.groups.map((g) => { const ids = plan.items.filter((i) => i.groupId === g.id).map((i) => i.id); return <li key={g.id} className="border-b border-border py-0.5 sm:col-span-2"><div className="flex justify-between"><b>{g.name} (rata-rata bobot sama)</b><span className="font-mono">{parentPct(plan, ids)}</span></div>{orderedRooms(p, g.id).map((r) => <div key={r.id} className="flex justify-between pl-4 text-muted-foreground"><span>{r.name} (rata-rata bobot sama)</span><span className="font-mono">{parentPct(plan, plan.items.filter((i) => i.roomId === r.id).map((i) => i.id))}</span></div>)}</li>; })}</ul></div>
    <ErrorBox msg={err} />
    <div className="space-y-2">{base.items.map((bi) => {
      const cur = plan.items.find((w) => w.id === bi.work.id); const lu = latestUpdate(plan, bi.work.id);
      let curQ: string; try { curQ = cur ? `${displayQuantity(workQuantity(p, cur).quantity)} ${cur.unit}` : 'dihapus'; } catch (e) { curQ = 'tidak valid: ' + (e as Error).message; }
      const over = lu && lu.completedQuantity > bi.quantity; const prg = workProgress(plan, bi.work.id);
      return <div key={bi.work.id} className="border border-border bg-card p-3 text-sm" data-testid={`row-progress-${bi.work.id}`}>
        <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs">{cur ? workNumber(p, cur) : '—'}</span><b>{bi.work.name}</b>{lu ? <Badge tone={statusTone(lu.status)}>{STATUS_LABEL[lu.status]}</Badge> : <Badge>Belum ada entri</Badge>}{over && <Badge tone="warn">Melebihi baseline</Badge>}<span className="ml-auto font-mono">{pct(prg)}</span></div>
        <div className="h-1.5 bg-muted mt-2"><div className="h-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, prg ?? 0))}%` }} /></div>
        <p className="text-xs text-muted-foreground mt-1">Baseline {displayQuantity(bi.quantity)} {bi.work.unit} · rencana saat ini {curQ} · selesai {lu ? displayQuantity(lu.completedQuantity) : '0'} {bi.work.unit}</p>
        {lu && lu.baselineId !== base.id && <p className="text-xs mt-1 border-l-2 border-[hsl(38,70%,40%)] pl-2">Status "{STATUS_LABEL[lu.status]}" tersimpan pada baseline sebelumnya. Persentase di atas dihitung terhadap baseline terkini; status lama tidak membuktikan rencana baru selesai. Catat entri baru untuk menegaskan.</p>}
        {lu && <p className="text-xs mt-1">Terakhir {fmtDate(lu.date)}: {lu.note}{lu.responsible ? ` (${lu.responsible})` : ''}</p>}
        {bi.materials.length > 0 && <p className="text-xs text-muted-foreground mt-1">Material: {bi.materials.map((m) => { const x = lu?.usage.find((y) => y.materialId === m.material.id); const ov = x && x.quantity > m.procurement; return `${m.material.name} ${x ? displayQuantity(x.quantity) : 'belum dicatat'} / ${displayQuantity(m.procurement)} ${m.material.unit}${ov ? ' (melebihi baseline)' : ''}`; }).join('; ')}</p>}
        <div className="flex gap-2 mt-2 no-print"><Btn sm v="primary" disabled={!cur} onClick={() => { setErr(null); setProg(bi.work.id); }} data-testid={`button-progress-${bi.work.id}`}>Catat progres / koreksi</Btn><Btn sm onClick={() => setHist(bi.work.id)}>Riwayat ({plan.updates.filter((u) => u.workId === bi.work.id).length})</Btn></div>
      </div>; })}</div>
    <details className="border border-border bg-card p-3 text-sm"><summary className="cursor-pointer font-medium">Riwayat baseline ({plan.baselines.length})</summary><ol className="mt-2 space-y-2">{[...plan.baselines].reverse().map((b, i) => <li key={b.id} className="border-t border-border pt-2"><b>{fmtDateTime(b.createdAt)}</b> {i === 0 && <Badge tone="ink">Terakhir</Badge>}<p>Alasan: {b.reason}</p><p className="text-xs text-muted-foreground">{b.items.map((x) => `${x.work.name} ${displayQuantity(x.quantity)} ${x.work.unit}`).join('; ') || 'Tidak ada pekerjaan'}</p></li>)}</ol></details>
    {dlg === 'rebase' && <ReasonDialog title="Baseline baru" label="Alasan perubahan baseline (wajib)" cta="Simpan baseline" body={<p>Baseline lama tetap tersimpan. Progres sebelumnya tidak diubah.</p>} onClose={() => setDlg(null)} onSubmit={(r) => save((x) => startExecution(x, r))} />}
    {prog && <ProgressForm p={p} workId={prog} onClose={() => setProg(null)} />}
    {hist && (() => { const w = base.items.find((i) => i.work.id === hist)?.work; return w ? <History p={p} work={w} onClose={() => setHist(null)} /> : null; })()}
  </section>;
}

export function OwnerInbox({ p, goWork }: { p: Project; goWork: (workId?: string) => void }) {
  const save = useSave(p.id); const ns = getWorkPlan(p).notifications; const unread = ns.filter((n) => !n.readAt).length;
  const [err, setErr] = useState<string | null>(null);
  const mark = (ids: string[]) => setErr(save((x) => { const pl = getWorkPlan(x); const t = new Date().toISOString(); return { ...x, workPlan: { ...pl, notifications: pl.notifications.map((n) => ids.includes(n.id) && !n.readAt ? { ...n, readAt: t } : n) } }; }, false));
  return <section className="space-y-3" data-testid="panel-owner-inbox">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display font-bold text-xl">Kotak masuk pemilik <Badge tone={unread ? 'accent' : 'muted'}>{unread} belum dibaca</Badge></h2>{unread > 0 && <Btn sm onClick={() => mark(ns.filter((n) => !n.readAt).map((n) => n.id))} data-testid="button-mark-all-read">Tandai semua dibaca</Btn>}</div>
    <p className="text-xs text-muted-foreground">Catatan dibuat lokal di perangkat ini saat pelaksanaan atau progres berubah. Tidak ada pengiriman ke pihak lain.</p>
    <ErrorBox msg={err} />
    {!ns.length ? <Empty title="Belum ada pemberitahuan" body="Pemberitahuan muncul setelah pelaksanaan dimulai atau progres dicatat." action={<Btn onClick={() => goWork()}>Buka rencana kerja</Btn>} /> :
      <ul className="space-y-1">{ns.map((n) => <li key={n.id} data-testid={`row-notification-${n.id}`} className={`border px-3 py-2 text-sm flex flex-wrap gap-2 items-start ${n.readAt ? 'border-border bg-card/60 text-muted-foreground' : 'border-accent bg-card'}`}>
        <div className="flex-1 min-w-[12rem]"><p className="text-xs font-mono">{fmtDateTime(n.createdAt)}{n.readAt ? ` · dibaca ${fmtDateTime(n.readAt)}` : ''}</p><p>{n.text}</p></div>
        <div className="flex gap-2"><Btn sm onClick={() => { if (!n.readAt) mark([n.id]); goWork(n.workId); }} data-testid={`button-open-${n.id}`}>{n.workId ? 'Buka pekerjaan' : 'Buka rencana kerja'}</Btn>{!n.readAt && <Btn sm onClick={() => mark([n.id])}>Tandai dibaca</Btn>}</div></li>)}</ul>}
  </section>;
}
