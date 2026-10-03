import { z } from 'zod';
import type { Project } from './types';

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const id = z.string().min(1).max(200).refine((s) => s.trim() === s && s.length > 0, 'ID tidak valid');
const text = z.string().max(100_000);
const date = z.string().refine((s) => s.trim().length > 0 && Number.isFinite(Date.parse(s)), 'Tanggal tidak valid');
const number = z.number().finite().nonnegative();
const revision = z.number().int().positive();
const source = z.enum(['manual', 'dokumen', 'tidak-diketahui']);
const state = z.enum(['existing', 'proposed', 'unknown']);
const room = z.object({
  id, name: text, floor: z.number().int().nonnegative(), length: number, width: number,
  height: number.nullable(), source, documentId: id.optional(), confirmed: z.boolean(),
  state: state.optional(), existingRoomId: id.optional(),
});
const component = z.object({
  id, type: text, name: text, dimensions: text, material: text,
  state: z.enum(['existing', 'proposed']), source, documentId: id.optional(), confirmed: z.boolean(),
});
const document = z.object({
  id, name: text, mime: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  size: number.int(), sourceState: state, uploadedAt: date,
  availability: z.enum(['available', 'unavailable']).optional(),
});
const project = z.object({
  id, name: text, mode: z.enum(['new', 'renovation']), province: text, city: text,
  floors: z.number().int().positive().nullable(), landArea: number.nullable(),
  footprintArea: number.nullable(), totalArea: number.nullable(),
  structure: text, material: text, description: text, revision,
  createdAt: date, updatedAt: date, status: z.enum(['draft', 'review-requested']),
  archived: z.boolean(), example: z.boolean().optional(),
  rooms: z.array(room), components: z.array(component), documents: z.array(document),
  observations: z.array(z.object({
    id, location: text, category: text, description: text, date,
    crackWidth: number.optional(), photoDocumentId: id.optional(),
  })),
  changes: z.array(z.object({ id, type: text, description: text, componentId: id.optional(), dimensions: text })),
  reviewNotes: z.array(z.object({ id, text, createdAt: date, revision })),
  reviewRequestedAt: date.optional(), reviewRequestedRevision: revision.optional(),
});
const envelope = z.discriminatedUnion('format', [
  z.object({ format: z.literal('kubangun-project-v1'), exportedAt: date, project }),
  z.object({ format: z.literal('kubangun-all-v1'), exportedAt: date, projects: z.array(project).min(1).max(1000) }),
]);

function unique(ids: string[], label: string) {
  if (new Set(ids).size !== ids.length) throw new Error(`${label}: ID duplikat dalam cadangan.`);
}
function validateLinks(p: Project) {
  for (const key of ['rooms', 'components', 'documents', 'observations', 'changes', 'reviewNotes'] as const)
    unique(p[key].map((x) => x.id), `${p.name} / ${key}`);
  const docs = new Set(p.documents.map((d) => d.id));
  const components = new Set(p.components.map((c) => c.id));
  const paired = new Set<string>();
  const requireLink = (value: string | undefined, ids: Set<string>, label: string) => {
    if (value !== undefined && !ids.has(value)) throw new Error(`${p.name}: tautan ${label} "${value}" tidak ditemukan.`);
  };
  for (const r of p.rooms) {
    requireLink(r.documentId, docs, 'dokumen ruang');
    if (r.existingRoomId !== undefined) {
      const existing = p.rooms.find((x) => x.id === r.existingRoomId);
      if (r.state !== 'proposed' || existing?.state !== 'existing' || paired.has(r.existingRoomId))
        throw new Error(`${p.name}: pasangan ruang "${r.id}" tidak valid atau dipakai lebih dari sekali.`);
      paired.add(r.existingRoomId);
    }
  }
  for (const c of p.components) requireLink(c.documentId, docs, 'dokumen komponen');
  for (const o of p.observations) requireLink(o.photoDocumentId, docs, 'foto observasi');
  for (const c of p.changes) requireLink(c.componentId, components, 'komponen perubahan');
  if (p.reviewRequestedRevision !== undefined && p.reviewRequestedRevision > p.revision)
    throw new Error(`${p.name}: revisi permintaan tinjauan melebihi revisi proyek.`);
  if (p.reviewNotes.some((n) => n.revision > p.revision))
    throw new Error(`${p.name}: catatan tinjauan melebihi revisi proyek.`);
}

export function parseBackup(json: string): Project[] {
  if (new Blob([json]).size > MAX_BACKUP_BYTES) throw new Error('Cadangan melebihi batas 10 MB.');
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { throw new Error('Berkas bukan JSON yang valid.'); }
  const result = envelope.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`Format cadangan tidak valid: ${issue.path.join('.') || 'format'} — ${issue.message}`);
  }
  const projects = result.data.format === 'kubangun-project-v1' ? [result.data.project] : result.data.projects;
  unique(projects.map((p) => p.id), 'Proyek');
  projects.forEach(validateLinks);
  return projects;
}

export type DuplicatePolicy = 'skip' | 'copy';
export interface ImportResult { projects: Project[]; added: number; skipped: number }

// Revalidate at the persistence boundary, not only when displaying a preview.
export function prepareImport(current: Project[], incoming: Project[], policy: DuplicatePolicy, newId: () => string = () => crypto.randomUUID()): ImportResult {
  const checked = parseBackup(JSON.stringify({ format: 'kubangun-all-v1', exportedAt: new Date().toISOString(), projects: incoming }));
  const used = new Set(current.flatMap((p) => [p.id, ...p.rooms.map((r) => r.id), ...p.components.map((c) => c.id), ...p.documents.map((d) => d.id), ...p.observations.map((o) => o.id), ...p.changes.map((c) => c.id), ...p.reviewNotes.map((n) => n.id)]));
  checked.forEach((p) => {
    used.add(p.id);
    for (const list of [p.rooms, p.components, p.documents, p.observations, p.changes, p.reviewNotes])
      list.forEach((x) => used.add(x.id));
  });
  const fresh = () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const value = newId();
      if (!used.has(value)) { used.add(value); return value; }
    }
    throw new Error('Tidak dapat membuat ID unik untuk pemulihan.');
  };
  const added: Project[] = [];
  let skipped = 0;
  for (const p of checked) {
    const duplicate = current.some((x) => x.id === p.id);
    if (duplicate && policy === 'skip') { skipped++; continue; }
    const roomIds = new Map(p.rooms.map((r) => [r.id, duplicate ? fresh() : r.id]));
    const componentIds = new Map(p.components.map((c) => [c.id, duplicate ? fresh() : c.id]));
    // Imported metadata must never accidentally open an unrelated local blob.
    const docIds = new Map(p.documents.map((d) => [d.id, fresh()]));
    added.push({
      ...p, id: duplicate ? fresh() : p.id, name: duplicate ? `${p.name} (salinan)` : p.name,
      rooms: p.rooms.map((r) => ({ ...r, id: roomIds.get(r.id)!, documentId: r.documentId ? docIds.get(r.documentId) : undefined, existingRoomId: r.existingRoomId ? roomIds.get(r.existingRoomId) : undefined })),
      components: p.components.map((c) => ({ ...c, id: componentIds.get(c.id)!, documentId: c.documentId ? docIds.get(c.documentId) : undefined })),
      documents: p.documents.map((d) => ({ ...d, id: docIds.get(d.id)!, availability: 'unavailable' })),
      observations: p.observations.map((o) => ({ ...o, id: duplicate ? fresh() : o.id, photoDocumentId: o.photoDocumentId ? docIds.get(o.photoDocumentId) : undefined })),
      changes: p.changes.map((c) => ({ ...c, id: duplicate ? fresh() : c.id, componentId: c.componentId ? componentIds.get(c.componentId) : undefined })),
      reviewNotes: p.reviewNotes.map((n) => ({ ...n, id: duplicate ? fresh() : n.id })),
    });
  }
  return { projects: [...added, ...current], added: added.length, skipped };
}