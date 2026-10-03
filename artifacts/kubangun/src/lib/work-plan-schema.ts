import { z } from 'zod';
import type { Project, WorkPlan } from './types';
import { calculateMaterial } from './work-plan';

const id = z.string().min(1).max(200);
const text = z.string().max(100_000);
const name = text.refine((s) => !!s.trim(), 'Nama wajib diisi');
const positive = z.number().finite().positive();
const nonnegative = z.number().finite().nonnegative();
const date = text.refine((s) => Number.isFinite(Date.parse(s)), 'Tanggal tidak valid');
const optionalDate = z.union([z.literal(''), date]);
const unit = z.enum(['kg', 'kuintal', 'm', 'm²', 'm³', 'lembar', 'buah', 'dus']);
const material = z.object({
  id, name, specification: text, unit, mode: z.enum(['manual', 'rate', 'coverage']),
  factor: positive.nullable(), basisUnit: unit, waste: nonnegative, packageSize: positive.nullable(),
  manualQuantity: nonnegative.nullable(), overrideQuantity: nonnegative.nullable(), overrideReason: text,
  boxContents: positive.nullable().optional(), boxContentsUnit: unit.optional(),
}).refine((m) => m.overrideQuantity === null || !!m.overrideReason.trim(), 'Override memerlukan alasan');
const work = z.object({
  id, groupId: id, roomId: id.optional(), name, specification: text,
  basis: z.enum(['room-area', 'explicit-area', 'manual']), quantity: positive.nullable(), unit,
  length: positive.nullable(), width: positive.nullable(), startDate: optionalDate, endDate: optionalDate,
  notes: text, materials: z.array(material), templateName: text.optional(),
}).refine((w) => !w.startDate || !w.endDate || Date.parse(w.startDate) <= Date.parse(w.endDate), 'Tanggal selesai mendahului mulai');
export const workPlanSchema = z.object({
  groups: z.array(z.object({ id, name, kind: z.enum(['floor', 'rooftop']), floor: z.number().int().nonnegative().nullable(), roomOrder: z.array(id) })),
  items: z.array(work),
  templates: z.array(z.object({ id, name, specification: text, prompts: text, materials: z.array(material) })),
  startedAt: date.optional(),
  baselines: z.array(z.object({
    id, createdAt: date, reason: name, fingerprint: z.string().max(10 * 1024 * 1024),
    items: z.array(z.object({ work, quantity: positive, materials: z.array(z.object({ material, raw: nonnegative, procurement: nonnegative })) })),
  })),
  updates: z.array(z.object({
    id, workId: id, baselineId: id, createdAt: date, date,
    status: z.enum(['not-started', 'in-progress', 'blocked', 'completed']),
    completedQuantity: nonnegative, responsible: text, note: name,
    usage: z.array(z.object({ materialId: id, quantity: nonnegative })),
  })),
  notifications: z.array(z.object({ id, createdAt: date, text, workId: id.optional(), readAt: date.optional() })),
});

export function validateWorkLinks(p: Project) {
  const plan = p.workPlan;
  if (!plan) return;
  const fail = (message: string): never => { throw new Error(`${p.name}: rencana pekerjaan — ${message}`); };
  const unique = (ids: string[], label: string) => { if (new Set(ids).size !== ids.length) fail(`ID duplikat ${label}.`); };
  unique(plan.groups.map((g) => g.id), 'kelompok');
  unique(plan.items.map((w) => w.id), 'pekerjaan');
  unique(plan.templates.map((t) => t.id), 'template');
  unique(plan.baselines.map((b) => b.id), 'baseline');
  unique(plan.updates.map((u) => u.id), 'pembaruan');
  unique(plan.notifications.map((n) => n.id), 'notifikasi');
  unique(plan.groups.filter((g) => g.kind === 'floor').map((g) => String(g.floor)), 'lantai');
  if (plan.groups.filter((g) => g.kind === 'rooftop').length !== 1) fail('harus ada satu kelompok Rooftop terpisah.');
  for (const g of plan.groups) {
    if (g.kind === 'floor' ? g.floor === null : g.floor !== null) fail('jenis dan nomor lantai tidak sesuai.');
    unique(g.roomOrder, 'urutan ruang');
    if (g.roomOrder.some((id) => !p.rooms.some((r) => r.id === id && g.kind === 'floor' && r.floor === g.floor))) fail('urutan ruang mengacu ruang/lantai yang tidak ditemukan.');
  }
  const checkWork = (w: WorkPlan['items'][number], historical = false) => {
    const group = plan.groups.find((g) => g.id === w.groupId);
    if (!group) fail('tautan kelompok pekerjaan tidak ditemukan.');
    const room = p.rooms.find((r) => r.id === w.roomId);
    if (w.roomId && !room) fail('tautan ruang pekerjaan tidak ditemukan.');
    // Historic dimensions/floor assignments may differ from the current room.
    if (!historical && group!.kind === 'floor' && (!room || room.floor !== group!.floor)) fail('pekerjaan lantai harus memilih ruang pada lantai yang sama.');
    if (group!.kind === 'rooftop' && w.roomId) fail('Rooftop tidak menggunakan ukuran ruang.');
    if (w.basis === 'room-area' && (!w.roomId || w.unit !== 'm²')) fail('luas ruang memerlukan ruang terpilih dan m².');
    if (w.basis === 'explicit-area' && w.unit !== 'm²') fail('luas kerja eksplisit memerlukan m².');
    unique(w.materials.map((m) => m.id), 'material pekerjaan');
  };
  plan.items.forEach((w) => checkWork(w));
  for (const t of plan.templates) unique(t.materials.map((m) => m.id), 'material template');
  if (!!plan.startedAt !== !!plan.baselines.length) fail('tanggal pelaksanaan dan baseline harus tersedia bersama.');
  for (const b of plan.baselines) {
    unique(b.items.map((i) => i.work.id), 'pekerjaan baseline');
    for (const i of b.items) {
      checkWork(i.work, true);
      if (!plan.items.some((w) => w.id === i.work.id)) fail('baseline mengacu pekerjaan terhapus.');
      unique(i.materials.map((m) => m.material.id), 'material baseline');
      if (i.materials.length !== i.work.materials.length || i.materials.some((m) => !i.work.materials.some((wm) => wm.id === m.material.id))) fail('snapshot material baseline tidak sesuai pekerjaan.');
      for (const m of i.materials) {
        const source = i.work.materials.find((wm) => wm.id === m.material.id)!;
        if (JSON.stringify(source) !== JSON.stringify(m.material)) fail('aturan material snapshot berbeda dari pekerjaan baseline.');
        try {
          const calculated = calculateMaterial(i.quantity, i.work.unit, m.material);
          if (calculated.raw !== m.raw || calculated.procurement !== m.procurement) fail('kuantitas material snapshot tidak sesuai aturan tersimpan.');
        } catch (e) { fail(`material baseline tidak valid: ${(e as Error).message}`); }
      }
      const live = plan.items.find((w) => w.id === i.work.id)!;
      if (live.unit !== i.work.unit || live.materials.some((m) => i.materials.some((bm) => bm.material.id === m.id && bm.material.unit !== m.unit))) fail('satuan rekaman baseline tidak boleh diubah.');
    }
  }
  for (const u of plan.updates) {
    const b = plan.baselines.find((b) => b.id === u.baselineId);
    const w = b?.items.find((i) => i.work.id === u.workId);
    if (!w) fail('tautan pekerjaan/baseline pembaruan tidak ditemukan.');
    if (!Number.isFinite(u.completedQuantity / w!.quantity * 100)) fail('persentase progres melampaui batas angka.');
    if (u.status === 'completed' && u.completedQuantity < w!.quantity) fail('Selesai belum mencapai rencana.');
    if (u.status === 'not-started' && (u.completedQuantity || u.usage.length)) fail('Belum dimulai memiliki kuantitas/penggunaan.');
    unique(u.usage.map((m) => m.materialId), 'penggunaan');
    if (u.usage.some((m) => !w!.materials.some((wm) => wm.material.id === m.materialId))) fail('tautan material penggunaan tidak ditemukan.');
  }
  if (plan.notifications.some((n) => n.workId && !plan.items.some((w) => w.id === n.workId))) fail('tautan notifikasi tidak ditemukan.');
}

// Snapshot IDs recur deliberately; remap them consistently with the live records.
export function remapWorkPlan(plan: WorkPlan, rooms: Map<string, string>, duplicate: boolean, fresh: () => string): WorkPlan {
  const mappings = new Map<string, string>();
  const remap = (id: string) => {
    if (!duplicate) return id;
    if (!mappings.has(id)) mappings.set(id, fresh());
    return mappings.get(id)!;
  };
  const mat = (m: WorkPlan['items'][number]['materials'][number]) => ({ ...m, id: remap(m.id) });
  const work = (w: WorkPlan['items'][number]) => ({ ...w, id: remap(w.id), groupId: remap(w.groupId), roomId: w.roomId ? rooms.get(w.roomId)! : undefined, materials: w.materials.map(mat) });
  const next: WorkPlan = {
    ...plan,
    groups: plan.groups.map((g) => ({ ...g, id: remap(g.id), roomOrder: g.roomOrder.map((id) => rooms.get(id)!) })),
    items: plan.items.map(work),
    templates: plan.templates.map((t) => ({ ...t, id: remap(t.id), materials: t.materials.map(mat) })),
    baselines: plan.baselines.map((b) => ({ ...b, id: remap(b.id), items: b.items.map((i) => ({ ...i, work: work(i.work), materials: i.materials.map((m) => ({ ...m, material: mat(m.material) })) })) })),
    updates: plan.updates.map((u) => ({ ...u, id: remap(u.id), workId: remap(u.workId), baselineId: remap(u.baselineId), usage: u.usage.map((m) => ({ ...m, materialId: remap(m.materialId) })) })),
    notifications: plan.notifications.map((n) => ({ ...n, id: remap(n.id), workId: n.workId ? remap(n.workId) : undefined })),
  };
  // Fingerprints include record references (also embedded measured room records).
  for (const b of next.baselines) {
    try {
      const parsed = JSON.parse(b.fingerprint) as (WorkPlan['items'][number] & { room?: Project['rooms'][number] })[];
      b.fingerprint = JSON.stringify(parsed.map((w) => ({
        ...work(w), ...(w.room ? { room: { ...w.room, id: rooms.get(w.room.id)!, existingRoomId: w.room.existingRoomId ? rooms.get(w.room.existingRoomId) : undefined } } : {}),
      })).map((w) => ({ ...w, materials: [...w.materials].sort((a, b) => a.id.localeCompare(b.id)) })).sort((a, b) => a.id.localeCompare(b.id)));
    } catch { /* Keep unknown historic fingerprints visibly outdated, never rewrite estimates. */ }
  }
  return next;
}