import type { Project, WorkPlan, WorkItem, Material, QuantityUnit, WorkTemplate, WorkUpdate } from './types';
import { uid } from './format';
import { fixRoomLinks } from './room-comparison';

export const UNITS: QuantityUnit[] = ['kg', 'kuintal', 'm', 'm²', 'm³', 'lembar', 'buah', 'dus'];
export const STATUS_LABEL = { 'not-started': 'Belum dimulai', 'in-progress': 'Dikerjakan', blocked: 'Terhambat', completed: 'Selesai' } as const;
const positive = (n: number | null): n is number => n !== null && Number.isFinite(n) && n > 0;
const nonnegative = (n: number | null): n is number => n !== null && Number.isFinite(n) && n >= 0;
export function blankMaterial(name = ''): Material {
  return { id: uid(), name, specification: '', unit: 'kg', mode: 'manual', factor: null, basisUnit: 'm²', waste: 0, packageSize: null, manualQuantity: null, overrideQuantity: null, overrideReason: '' };
}
export function defaultTemplates(): WorkTemplate[] {
  return [
    { id: 'template-tile', name: 'Pemasangan Keramik Lantai', specification: '', prompts: 'Pilih ruang terukur dan lantai penuh atau kuantitas manual. Isi kg semen per m², kebutuhan pasir, cakupan m² per dus dan susut sendiri. Contoh 3 kg, 10 dus dan 1 kuintal bukan koefisien baku.', materials: [
      { ...blankMaterial('Semen'), mode: 'rate' },
      { ...blankMaterial('Keramik'), mode: 'coverage', unit: 'dus', specification: 'Isi ukuran keramik dan cakupan dus dari sumber Anda' },
      { ...blankMaterial('Pasir'), unit: 'kuintal' },
    ] },
    { id: 'template-roof', name: 'Pemasangan Atap Alderon', specification: '', prompts: 'Masukkan luas permukaan atap secara eksplisit, bukan luas ruang. Isi cakupan efektif m² per lembar menurut sumber Anda; tidak ada estimasi kemiringan atau tumpang tindih otomatis. Contoh 5 m × 5 m bukan spesifikasi pabrik.', materials: [
      { ...blankMaterial('Alderon'), mode: 'coverage', unit: 'lembar', specification: 'Dimensi dan cakupan efektif diisi pengguna' },
    ] },
  ];
}
// Derived at read time: no legacy room dimensions or classifications are rewritten.
export function getWorkPlan(p: Project): WorkPlan {
  const base = p.workPlan ?? { groups: [], items: [], templates: defaultTemplates(), baselines: [], updates: [], notifications: [] };
  const groups = [...base.groups];
  for (const floor of [...new Set(p.rooms.map((r) => r.floor))].sort((a, b) => a - b))
    if (!groups.some((g) => g.kind === 'floor' && g.floor === floor))
      groups.push({ id: `floor-${floor}`, kind: 'floor', floor, name: `Lantai ${floor}`, roomOrder: [] });
  if (!groups.some((g) => g.kind === 'rooftop')) groups.push({ id: 'rooftop', kind: 'rooftop', floor: null, name: 'Rooftop', roomOrder: [] });
  return { ...base, groups };
}
export function blankWork(groupId: string, roomId?: string): WorkItem {
  return { id: uid(), groupId, roomId, name: '', specification: '', basis: roomId ? 'room-area' : 'explicit-area', quantity: null, unit: 'm²', length: null, width: null, startDate: '', endDate: '', notes: '', materials: [] };
}
export function applyTemplate(w: WorkItem, t: WorkTemplate): WorkItem {
  return { ...w, name: t.name, specification: t.specification, notes: t.prompts, templateName: t.name, materials: t.materials.map((m) => ({ ...m, id: uid() })) };
}
export function workQuantity(p: Project, w: WorkItem): { quantity: number; rule: string } {
  let q: number | null;
  let rule: string;
  if (w.basis === 'room-area') {
    const r = p.rooms.find((r) => r.id === w.roomId);
    if (!r || !positive(r.length) || !positive(r.width)) throw new Error('Pilih ruang terukur dengan panjang dan lebar positif.');
    if (w.unit !== 'm²') throw new Error('Luas ruang harus menggunakan satuan m².');
    q = r.length * r.width; rule = `${r.length} m × ${r.width} m (lantai penuh; tanpa pengurangan renovasi)`;
  } else if (w.basis === 'explicit-area') {
    if (w.unit !== 'm²') throw new Error('Luas kerja/atap harus menggunakan satuan m².');
    if (w.length !== null || w.width !== null) {
      if (!positive(w.length) || !positive(w.width)) throw new Error('Isi kedua dimensi kerja/atap lebih dari 0 atau kosongkan keduanya dan isi luas.');
      q = w.length * w.width; rule = `${w.length} m × ${w.width} m (dimensi kerja eksplisit)`;
    } else { q = w.quantity; rule = 'Luas kerja/atap diisi eksplisit pengguna'; }
  } else { q = w.quantity; rule = 'Kuantitas manual pengguna'; }
  if (!positive(q)) throw new Error('Kuantitas pekerjaan harus positif dan terbatas; periksa ukuran atau jumlah.');
  return { quantity: q, rule };
}
export interface MaterialCalculation { raw: number; procurement: number; unit: QuantityUnit; rule: string; overridden: boolean }
export function calculateMaterial(q: number, workUnit: QuantityUnit, m: Material): MaterialCalculation {
  if (!positive(q)) throw new Error('Kuantitas pekerjaan tidak valid.');
  if (!nonnegative(m.waste)) throw new Error('Susut harus angka terbatas, minimal 0%.');
  if (m.factor !== null && !positive(m.factor)) throw new Error(m.mode === 'rate' ? 'Isi konsumsi material lebih dari 0.' : 'Isi cakupan/faktor material lebih dari 0.');
  if (m.boxContents != null && (!positive(m.boxContents) || !m.boxContentsUnit || m.boxContentsUnit === 'dus')) throw new Error('Isi dus harus positif dengan satuan isi yang bukan dus.');
  if (m.packageSize !== null && !positive(m.packageSize)) throw new Error('Isi kemasan harus lebih dari 0.');
  const integer = ['lembar', 'buah', 'dus'].includes(m.unit);
  if (integer && m.packageSize !== null && !Number.isSafeInteger(m.packageSize)) throw new Error('Kelipatan pengadaan lembar/buah/dus harus bilangan bulat positif.');
  const boxKnown = positive(m.boxContents ?? null) && !!m.boxContentsUnit && m.boxContentsUnit !== 'dus';
  let raw: number; let rule: string;
  if (m.mode === 'manual') {
    if (!nonnegative(m.manualQuantity)) throw new Error('Isi jumlah material manual minimal 0.');
    raw = m.manualQuantity; rule = `Manual: ${raw} ${m.unit} (susut tidak diterapkan)`;
  } else {
    if (m.basisUnit !== workUnit) throw new Error(`Satuan dasar ${m.basisUnit} tidak cocok dengan pekerjaan ${workUnit}. Ubah satuan dasar; tidak ada konversi massa/volume otomatis.`);
    if (!positive(m.factor)) throw new Error(m.mode === 'rate' ? 'Isi konsumsi material per satuan kerja lebih dari 0.' : 'Isi cakupan efektif per lembar/buah/dus lebih dari 0.');
    if (m.unit === 'dus' && m.mode !== 'coverage' && !boxKnown) throw new Error('Dus memerlukan cakupan efektif atau jumlah dan satuan isi dus eksplisit.');
    if (m.mode === 'coverage' && !['lembar', 'buah', 'dus'].includes(m.unit)) throw new Error('Aturan cakupan hanya untuk lembar, buah, atau dus. Gunakan konsumsi untuk massa/panjang/volume.');
    raw = m.mode === 'rate' ? q * m.factor * (1 + m.waste / 100) : q * (1 + m.waste / 100) / m.factor;
    rule = m.mode === 'rate' ? `${q} ${workUnit} × ${m.factor} ${m.unit}/${m.basisUnit} × (1 + ${m.waste}/100)` : `${q} ${workUnit} × (1 + ${m.waste}/100) ÷ ${m.factor} ${m.basisUnit}/${m.unit}`;
  }
  if (!nonnegative(raw)) throw new Error('Hasil perhitungan melampaui batas angka; kurangi input dan periksa satuan.');
  if (m.mode !== 'manual' && raw === 0) throw new Error('Hasil perhitungan terlalu kecil untuk batas angka yang aman; periksa kuantitas dan faktor, bukan dianggap nol.');
  const overridden = m.overrideQuantity !== null;
  if (overridden && (!nonnegative(m.overrideQuantity) || !m.overrideReason.trim())) throw new Error('Override memerlukan jumlah minimal 0 dan alasan tertulis.');
  const requirement = overridden ? m.overrideQuantity! : raw;
  if (m.unit === 'dus' && m.mode === 'manual' && !positive(m.factor) && !boxKnown)
    throw new Error('Dus manual memerlukan isi dus atau cakupan yang dinyatakan eksplisit.');
  const step = m.packageSize ?? (integer ? 1 : 0);
  const procurement = step ? Math.ceil(requirement / step) * step : requirement;
  if (!nonnegative(procurement) || (integer && !Number.isSafeInteger(procurement))) throw new Error('Jumlah pengadaan melampaui batas angka yang aman.');
  return { raw, procurement, unit: m.unit, rule: `${rule}${m.unit === 'dus' && boxKnown ? `; isi dus: ${m.boxContents} ${m.boxContentsUnit}/dus` : m.unit === 'dus' && positive(m.factor) ? `; cakupan: ${m.factor} ${m.basisUnit}/dus` : ''}${step ? `; dibulatkan ke kelipatan ${step} ${m.unit}` : '; massa/volume/panjang tidak dibulatkan (tampilan 3 desimal)'}${overridden ? `; override ${requirement} ${m.unit}: ${m.overrideReason}` : ''}`, overridden };
}
export const displayQuantity = (q: number) => q.toLocaleString('id-ID', { maximumFractionDigits: 3 });
export function planFingerprint(p: Project): string {
  const plan = getWorkPlan(p);
  // Ordering and presentation do not change engineering quantities.
  return JSON.stringify(plan.items.map((w) => {
    const r = w.roomId ? p.rooms.find((r) => r.id === w.roomId) : undefined;
    return { ...w, materials: [...w.materials].sort((a, b) => a.id.localeCompare(b.id)), room: r ? { id: r.id, length: r.length, width: r.width, floor: r.floor } : undefined };
  }).sort((a, b) => a.id.localeCompare(b.id)));
}
export function baselineOutdated(p: Project): boolean {
  const plan = getWorkPlan(p); const last = plan.baselines.at(-1);
  return !!last && last.fingerprint !== planFingerprint(p);
}
export function addNotification(plan: WorkPlan, text: string, workId?: string): WorkPlan {
  return { ...plan, notifications: [{ id: uid(), createdAt: new Date().toISOString(), text, ...(workId ? { workId } : {}) }, ...plan.notifications] };
}
export function startExecution(p: Project, reason = 'Mulai pelaksanaan'): Project {
  const plan = getWorkPlan(p);
  if (!reason.trim()) throw new Error('Alasan perubahan baseline wajib diisi.');
  if (!plan.items.length) throw new Error('Tambahkan pekerjaan sebelum memulai pelaksanaan.');
  const fingerprint = planFingerprint(p);
  const previous = plan.baselines.at(-1);
  if (previous && previous.fingerprint === fingerprint && previous.reason === reason.trim()) return p;
  const items = plan.items.map((work) => {
    for (const b of plan.baselines) {
      const prior = b.items.find((i) => i.work.id === work.id);
      if (prior && prior.work.unit !== work.unit) throw new Error(`${work.name}: satuan pekerjaan baseline ${prior.work.unit} tidak boleh diubah; buat pekerjaan baru agar riwayat tidak berubah satuan.`);
      for (const m of work.materials) {
        const old = prior?.materials.find((i) => i.material.id === m.id);
        if (old && old.material.unit !== m.unit) throw new Error(`${m.name}: satuan material baseline tidak boleh diubah; buat material baru.`);
      }
    }
    const { quantity } = workQuantity(p, work);
    const materials = work.materials.map((material) => {
      try {
        const { raw, procurement } = calculateMaterial(quantity, work.unit, material);
        return { material: { ...material }, raw, procurement };
      } catch (e) { throw new Error(`${work.name} / ${material.name}: ${(e as Error).message}`); }
    });
    return { work: structuredClone(work), quantity, materials };
  });
  const now = new Date().toISOString();
  const next = { ...plan, startedAt: plan.startedAt ?? now, baselines: [...plan.baselines, { id: uid(), createdAt: now, reason: reason.trim(), fingerprint, items }] };
  return { ...p, workPlan: addNotification(next, `${p.name}: ${plan.startedAt ? 'baseline diubah' : 'pelaksanaan dimulai'} — ${reason.trim()}`) };
}
export function latestUpdate(plan: WorkPlan, workId: string): WorkUpdate | undefined { return plan.updates.filter((u) => u.workId === workId).at(-1); }
export function workProgress(plan: WorkPlan, workId: string): number | null {
  const b = plan.baselines.at(-1)?.items.find((i) => i.work.id === workId);
  if (!b || !positive(b.quantity)) return null;
  return (latestUpdate(plan, workId)?.completedQuantity ?? 0) / b.quantity * 100;
}
export function meanProgress(plan: WorkPlan, workIds: string[]): number | null {
  const values = workIds.map((id) => workProgress(plan, id)).filter((v): v is number => v !== null);
  if (!values.length) return null;
  const mean = values.reduce((sum, v) => sum + v / values.length, 0);
  return Number.isFinite(mean) ? mean : null;
}
export function recordProgress(p: Project, input: Omit<WorkUpdate, 'id' | 'baselineId' | 'createdAt'>): Project {
  const plan = getWorkPlan(p); const baseline = plan.baselines.at(-1);
  if (!plan.startedAt || !baseline) throw new Error('Mulai pelaksanaan dan simpan baseline terlebih dahulu.');
  if (baselineOutdated(p)) throw new Error('Baseline kedaluwarsa. Simpan baseline baru dengan alasan sebelum mencatat progres.');
  const work = baseline.items.find((w) => w.work.id === input.workId);
  if (!work) throw new Error('Pekerjaan belum masuk baseline.');
  if (!nonnegative(input.completedQuantity)) throw new Error('Kuantitas selesai harus angka terbatas minimal 0.');
  if (!Number.isFinite(input.completedQuantity / work.quantity * 100)) throw new Error('Persentase progres melampaui batas angka.');
  if (!input.note.trim()) throw new Error('Isi catatan pembaruan/koreksi agar riwayat terdokumentasi.');
  if (!Number.isFinite(Date.parse(input.date))) throw new Error('Isi tanggal pembaruan yang valid.');
  if (input.status === 'completed' && input.completedQuantity < work.quantity) throw new Error('Status Selesai memerlukan kuantitas selesai minimal rencana.');
  if (input.status === 'not-started' && (input.completedQuantity !== 0 || input.usage.length)) throw new Error('Belum dimulai tidak boleh memiliki kuantitas selesai atau penggunaan material.');
  if (new Set(input.usage.map((u) => u.materialId)).size !== input.usage.length) throw new Error('Material penggunaan duplikat.');
  for (const u of input.usage)
    if (!nonnegative(u.quantity) || !work.materials.some((m) => m.material.id === u.materialId)) throw new Error('Penggunaan material harus minimal 0 dan mengacu material baseline.');
  const last = latestUpdate(plan, input.workId);
  // A note-only correction is a real event; an unchanged save is not.
  const same = last && ['date', 'status', 'completedQuantity', 'responsible', 'note'].every((k) => JSON.stringify(last[k as keyof WorkUpdate]) === JSON.stringify(input[k as keyof typeof input]))
    && JSON.stringify([...last.usage].sort((a, b) => a.materialId.localeCompare(b.materialId))) === JSON.stringify([...input.usage].sort((a, b) => a.materialId.localeCompare(b.materialId)));
  if (same) return p;
  const update = { ...input, id: uid(), baselineId: baseline.id, createdAt: new Date().toISOString() };
  return { ...p, workPlan: addNotification({ ...plan, updates: [...plan.updates, update] }, `${p.name} / ${work.work.name}: ${STATUS_LABEL[input.status]} — ${displayQuantity(input.completedQuantity)} ${work.work.unit}. ${input.note}`, input.workId) };
}
export function deleteWork(p: Project, ids: string[]): Project {
  const plan = getWorkPlan(p); const gone = new Set(ids);
  const removed = plan.items.some((w) => gone.has(w.id));
  return { ...p, workPlan: { ...plan, items: plan.items.filter((w) => !gone.has(w.id)), updates: plan.updates.filter((u) => !gone.has(u.workId)), baselines: plan.baselines.map((b) => ({ ...b, fingerprint: removed ? 'outdated:work-deleted' : b.fingerprint, items: b.items.filter((i) => !gone.has(i.work.id)) })), notifications: plan.notifications.filter((n) => !n.workId || !gone.has(n.workId)) } };
}
export function syncRoomWork(p: Project): Project {
  if (!p.workPlan) return p;
  const plan = getWorkPlan(p);
  return { ...p, workPlan: { ...plan,
    groups: plan.groups.map((g) => ({ ...g, roomOrder: g.roomOrder.filter((id) => p.rooms.some((r) => r.id === id && r.floor === g.floor)) })),
    items: plan.items.map((w) => {
      const r = p.rooms.find((r) => r.id === w.roomId);
      return r ? { ...w, groupId: plan.groups.find((g) => g.kind === 'floor' && g.floor === r.floor)!.id } : w;
    }),
  } };
}
export function historicalRoomDependents(p: Project, roomId: string): WorkItem[] {
  const plan = p.workPlan;
  if (!plan) return [];
  const historicIds = new Set(plan.baselines.flatMap((b) => b.items.filter((i) => i.work.roomId === roomId).map((i) => i.work.id)));
  return plan.items.filter((w) => w.roomId !== roomId && historicIds.has(w.id));
}
export function deleteRoomAndWork(p: Project, roomId: string): Project {
  const dependents = historicalRoomDependents(p, roomId);
  if (dependents.length) throw new Error(`Ruang ini masih digunakan baseline lama pekerjaan yang telah dipindahkan: ${dependents.map((w) => w.name).join(', ')}. Pertahankan ruang untuk menyimpan riwayat, atau hapus pekerjaan tersebut beserta riwayatnya melalui konfirmasi pekerjaan terlebih dahulu.`);
  const next = p.workPlan ? deleteWork(p, p.workPlan.items.filter((w) => w.roomId === roomId).map((w) => w.id)) : p;
  return syncRoomWork({ ...next, rooms: fixRoomLinks(next.rooms.filter((r) => r.id !== roomId)) });
}
export function orderedRooms(p: Project, groupId: string) {
  const g = getWorkPlan(p).groups.find((g) => g.id === groupId);
  return p.rooms.filter((r) => g?.kind === 'floor' && r.floor === g.floor).sort((a, b) => {
    const ai = g!.roomOrder.indexOf(a.id), bi = g!.roomOrder.indexOf(b.id);
    return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi);
  });
}
export function workNumber(p: Project, w: WorkItem): string {
  const plan = getWorkPlan(p); const gn = plan.groups.findIndex((g) => g.id === w.groupId) + 1;
  const rn = w.roomId ? orderedRooms(p, w.groupId).findIndex((r) => r.id === w.roomId) + 1 : 0;
  const wn = plan.items.filter((i) => i.groupId === w.groupId && i.roomId === w.roomId).findIndex((i) => i.id === w.id) + 1;
  return `${gn}.${rn ? `${rn}.` : ''}${wn}`;
}
export function materialLetter(index: number): string {
  let n = index + 1, text = '';
  while (n > 0) { n--; text = String.fromCharCode(97 + n % 26) + text; n = Math.floor(n / 26); }
  return text;
}
export function materialSchedule(p: Project, ids = getWorkPlan(p).items.map((w) => w.id)) {
  const rows = new Map<string, { name: string; specification: string; unit: QuantityUnit; total: number; contributors: { workId: string; materialId: string; quantity: number; rule: string }[] }>();
  const errors: string[] = [];
  for (const w of getWorkPlan(p).items.filter((w) => ids.includes(w.id))) {
    for (const m of w.materials) try {
      const q = workQuantity(p, w).quantity; const c = calculateMaterial(q, w.unit, m);
      // Do not infer interchangeability or mass/volume conversion from a name.
      const key = JSON.stringify([m.name.trim(), m.specification.trim(), m.unit,
        m.mode === 'coverage' ? [m.factor, m.basisUnit] : null,
        m.unit === 'dus' ? [m.factor, m.basisUnit, m.boxContents, m.boxContentsUnit, m.packageSize] : null]);
      const row = rows.get(key) ?? { name: m.name, specification: m.specification, unit: m.unit, total: 0, contributors: [] };
      const total = row.total + c.procurement;
      if (!Number.isFinite(total)) throw new Error('Jumlah gabungan melampaui batas angka.');
      row.total = total; row.contributors.push({ workId: w.id, materialId: m.id, quantity: c.procurement, rule: c.rule }); rows.set(key, row);
    } catch (e) { errors.push(`${w.name} / ${m.name}: ${(e as Error).message}`); }
  }
  return { rows: [...rows.values()], errors };
}