import { Fragment } from 'react';
import type { Project, WorkItem } from '@/lib/types';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { STATUS_LABEL, baselineOutdated, calculateMaterial, displayQuantity, getWorkPlan, latestUpdate, materialLetter, materialSchedule, meanProgress, orderedRooms, workNumber, workProgress, workQuantity } from '@/lib/work-plan';

const th = 'text-left font-semibold border border-black/40 px-1.5 py-1 align-top';
const td = 'border border-black/30 px-1.5 py-1 align-top';
const roomState = (s?: string) => s === 'existing' ? 'Eksisting' : s === 'proposed' ? 'Usulan' : 'Belum diklasifikasi';
const pct = (n: number | null) => n === null ? 'Belum ada' : n.toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%';

function qty(p: Project, w: WorkItem) { try { const x = workQuantity(p, w); return { text: `${displayQuantity(x.quantity)} ${w.unit}`, rule: x.rule, q: x.quantity }; } catch (e) { return { text: 'Tidak valid', rule: (e as Error).message, q: null as number | null }; } }

function WorkBlock({ p, w }: { p: Project; w: WorkItem }) {
  const q = qty(p, w);
  return <div className="mb-3 break-inside-avoid"><p className="font-semibold">{workNumber(p, w)} {w.name}{w.specification ? ` — ${w.specification}` : ''}</p>
    <p>Kuantitas rencana: {q.text}. Aturan: {q.rule}. Jadwal: {w.startDate ? fmtDate(w.startDate) : 'belum diisi'} s.d. {w.endDate ? fmtDate(w.endDate) : 'belum diisi'}.{w.notes ? ` Catatan: ${w.notes}` : ''}</p>
    {w.materials.length > 0 && <table className="w-full border-collapse mt-1"><thead><tr><th className={th}>No</th><th className={th}>Material</th><th className={th}>Mentah</th><th className={th}>Pengadaan</th><th className={th}>Aturan dan asumsi</th></tr></thead><tbody>
      {w.materials.map((m, i) => { let c = null as ReturnType<typeof calculateMaterial> | null; let e = ''; try { if (q.q === null) throw new Error('Kuantitas pekerjaan tidak valid.'); c = calculateMaterial(q.q, w.unit, m); } catch (x) { e = (x as Error).message; }
        return <tr key={m.id}><td className={td}>{workNumber(p, w)}.{materialLetter(i)}</td><td className={td}>{m.name}{m.specification ? ` (${m.specification})` : ''}</td><td className={td}>{c ? `${displayQuantity(c.raw)} ${m.unit}` : '-'}</td><td className={td}>{c ? `${displayQuantity(c.procurement)} ${m.unit}` : '-'}</td><td className={td}>{c ? c.rule : `Galat: ${e}`}</td></tr>; })}</tbody></table>}</div>;
}

export function WorkReport({ p }: { p: Project }) {
  const plan = getWorkPlan(p);
  if (!plan.items.length && !plan.baselines.length) return <section className="mt-6" data-testid="report-work"><h2 className="font-display font-bold text-xl mb-1">Rencana Kerja dan Material</h2><p className="text-sm">Belum ada pekerjaan direncanakan; pelaksanaan belum dimulai.</p></section>;
  const pctIds = (ids: string[]) => ids.length ? pct(meanProgress(plan, ids)) : 'Tidak ada pekerjaan';
  const sum = (gid: string) => pctIds(plan.items.filter((w) => w.groupId === gid).map((w) => w.id));
  const sch = materialSchedule(p); const base = plan.baselines.at(-1);
  return <section className="mt-6 text-xs space-y-4" data-testid="report-work">
    <h2 className="font-display font-bold text-xl">Rencana Kerja dan Material</h2>
    {!plan.items.length && <p>Tidak ada pekerjaan tersisa. Baseline bertanggal di bawah tetap mencatat bahwa pelaksanaan pernah dimulai; rincian pekerjaan yang dihapus telah dibuang sesuai konfirmasi.</p>}
    {!base && <p className="font-semibold">Pelaksanaan belum dimulai: belum ada baseline, progres, atau penggunaan material.</p>}
    {base && baselineOutdated(p) && <p className="font-semibold border border-black p-1">Peringatan: baseline kedaluwarsa. Rencana saat ini berbeda dari baseline terakhir.</p>}
    <p>Angka ditampilkan maksimal 3 desimal; nilai tersimpan tidak dibulatkan kecuali aturan pengadaan.</p>
    <p>Koefisien, susut, dan cakupan adalah masukan pengguna, bukan standar bersertifikat. Pengadaan dibulatkan menurut isi kemasan atau satuan bulat. Tidak ada konversi satuan otomatis (1 kuintal = 100 kg, tetapi kg dan kuintal dijumlahkan terpisah).</p>
    {plan.groups.map((g, gi) => { const gItems = plan.items.filter((w) => w.groupId === g.id); if (!gItems.length) return null; const rooms = orderedRooms(p, g.id);
      return <div key={g.id}><h3 className="font-semibold text-sm border-b border-black/50 mb-1">{gi + 1}. {g.name}</h3>
        {gItems.filter((w) => !w.roomId).map((w) => <WorkBlock key={w.id} p={p} w={w} />)}
        {rooms.map((r, ri) => { const ws = gItems.filter((w) => w.roomId === r.id); if (!ws.length) return null; return <div key={r.id} className="ml-3"><p className="font-semibold">{gi + 1}.{ri + 1} {r.name} ({r.length} m × {r.width} m; {roomState(r.state)})</p>{ws.map((w) => <WorkBlock key={w.id} p={p} w={w} />)}</div>; })}
        {gItems.filter((w) => w.roomId && !rooms.some((r) => r.id === w.roomId)).map((w) => <WorkBlock key={w.id} p={p} w={w} />)}</div>; })}
    <div className="break-inside-avoid"><h3 className="font-semibold text-sm">Jadwal material gabungan</h3>
      {sch.rows.length ? <table className="w-full border-collapse"><thead><tr><th className={th}>Material</th><th className={th}>Total pengadaan</th><th className={th}>Kontributor</th></tr></thead><tbody>{sch.rows.map((r, i) => <tr key={i}><td className={td}>{r.name}{r.specification ? ` (${r.specification})` : ''}</td><td className={td}>{displayQuantity(r.total)} {r.unit}</td><td className={td}>{r.contributors.map((c) => { const w = plan.items.find((x) => x.id === c.workId); return `${w ? workNumber(p, w) : ''} ${w?.name ?? ''}: ${displayQuantity(c.quantity)}`; }).join('; ')}</td></tr>)}</tbody></table> : <p>Tidak ada material yang dapat dihitung.</p>}
      {sch.errors.length > 0 && <div className="mt-1"><p className="font-semibold">Galat perhitungan (tidak dimasukkan ke total):</p><ul className="list-disc ml-5">{sch.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}</div>
    {base && <div><h3 className="font-semibold text-sm">Baseline pelaksanaan</h3><p>Dimulai {plan.startedAt ? fmtDateTime(plan.startedAt) : '-'}. Rata-rata progres bobot sama: {pct(meanProgress(plan, plan.items.map((w) => w.id)))} (bukan bobot teknik atau biaya).</p>
      {plan.baselines.map((b, i) => <div key={b.id} className="mt-2 break-inside-avoid"><p className="font-semibold">Baseline {i + 1} — {fmtDateTime(b.createdAt)}. Alasan: {b.reason}</p>
        <table className="w-full border-collapse"><thead><tr><th className={th}>Pekerjaan</th><th className={th}>Kuantitas</th><th className={th}>Jadwal asli</th><th className={th}>Material (mentah / pengadaan)</th></tr></thead><tbody>{b.items.map((it) => <tr key={it.work.id}><td className={td}>{it.work.name}</td><td className={td}>{displayQuantity(it.quantity)} {it.work.unit}</td><td className={td}>{it.work.startDate ? fmtDate(it.work.startDate) : '-'} s.d. {it.work.endDate ? fmtDate(it.work.endDate) : '-'}</td><td className={td}>{it.materials.map((m) => { let rl = ''; try { rl = calculateMaterial(it.quantity, it.work.unit, m.material).rule; } catch (e) { rl = (e as Error).message; } return `${m.material.name}${m.material.specification ? ' (' + m.material.specification + ')' : ''} ${displayQuantity(m.raw)} / ${displayQuantity(m.procurement)} ${m.material.unit}. Aturan: ${rl}`; }).join('; ') || '-'}</td></tr>)}</tbody></table></div>)}
      <h3 className="font-semibold text-sm mt-3">Ringkasan progres (rata-rata bobot sama, bukan bobot teknik atau biaya)</h3>
      <table className="w-full border-collapse"><tbody>{plan.groups.map((g) => <Fragment key={g.id}>
        <tr key={g.id}><td className={td}><b>{g.name}</b></td><td className={td}>{sum(g.id)}</td></tr>
        {orderedRooms(p, g.id).map((r) => <tr key={r.id}><td className={td + ' pl-4'}>{r.name}</td><td className={td}>{pctIds(plan.items.filter((w) => w.roomId === r.id).map((w) => w.id))}</td></tr>)}</Fragment>)}
        <tr><td className={td}><b>Proyek</b></td><td className={td}>{pctIds(plan.items.map((w) => w.id))}</td></tr></tbody></table>
      <h3 className="font-semibold text-sm mt-3">Progres terkini terhadap baseline terakhir</h3>
      <table className="w-full border-collapse"><thead><tr><th className={th}>Pekerjaan</th><th className={th}>Status</th><th className={th}>Selesai / baseline</th><th className={th}>Penyimpangan</th><th className={th}>Penggunaan material</th></tr></thead><tbody>{base.items.map((it) => { const lu = latestUpdate(plan, it.work.id); const cur = plan.items.find((w) => w.id === it.work.id); const cq = cur ? qty(p, cur) : null;
        const dev: string[] = []; if (!cur) dev.push('Pekerjaan dihapus dari rencana'); else if (cq?.q != null && cq.q !== it.quantity) dev.push(`Rencana kini ${cq.text} vs baseline ${displayQuantity(it.quantity)} ${it.work.unit}`); if (lu && lu.completedQuantity > it.quantity) dev.push('Selesai melebihi baseline');
        for (const m of it.materials) { const u = lu?.usage.find((x) => x.materialId === m.material.id); if (u && u.quantity > m.procurement) dev.push(`${m.material.name} melebihi baseline`); }
        return <tr key={it.work.id}><td className={td}>{it.work.name}</td><td className={td}>{lu ? STATUS_LABEL[lu.status] + (lu.baselineId !== base.id ? ' (pada baseline sebelumnya; bukan bukti rencana baru selesai)' : '') : 'Belum ada entri'}</td><td className={td}>{displayQuantity(lu?.completedQuantity ?? 0)} / {displayQuantity(it.quantity)} {it.work.unit} ({pct(workProgress(plan, it.work.id))})</td><td className={td}>{dev.join('; ') || 'Tidak ada'}</td><td className={td}>{it.materials.map((m) => { const u = lu?.usage.find((x) => x.materialId === m.material.id); return `${m.material.name}: ${u ? displayQuantity(u.quantity) + ' ' + m.material.unit : 'belum dicatat'} (baseline ${displayQuantity(m.procurement)})`; }).join('; ') || '-'}</td></tr>; })}</tbody></table>
      <h3 className="font-semibold text-sm mt-3">Riwayat entri bertanggal</h3>
      {plan.updates.length ? <table className="w-full border-collapse"><thead><tr><th className={th}>Tanggal</th><th className={th}>Pekerjaan</th><th className={th}>Status</th><th className={th}>Selesai</th><th className={th}>Penanggung jawab</th><th className={th}>Penggunaan material kumulatif</th><th className={th}>Catatan</th><th className={th}>Dicatat</th></tr></thead><tbody>{plan.updates.map((u) => { const w = plan.baselines.find((b) => b.id === u.baselineId)?.items.find((i) => i.work.id === u.workId)?.work; return <tr key={u.id}><td className={td}>{fmtDate(u.date)}</td><td className={td}>{w?.name ?? 'Pekerjaan dihapus'}</td><td className={td}>{STATUS_LABEL[u.status]}</td><td className={td}>{displayQuantity(u.completedQuantity)} {w?.unit}</td><td className={td}>{u.responsible || '-'}</td><td className={td}>{(plan.baselines.find((b) => b.id === u.baselineId)?.items.find((i) => i.work.id === u.workId)?.materials ?? []).map((m) => { const x = u.usage.find((y) => y.materialId === m.material.id); return `${m.material.name}: ${x ? displayQuantity(x.quantity) + ' ' + m.material.unit : 'belum dicatat'}`; }).join('; ') || '-'}</td><td className={td}>{u.note}</td><td className={td}>{fmtDateTime(u.createdAt)}</td></tr>; })}</tbody></table> : <p>Belum ada entri progres.</p>}</div>}
  </section>;
}
