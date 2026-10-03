import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedProjects } from './seed';
import { projectJson, projectsJson } from './export';
import { parseBackup, prepareImport } from './import';
import { applyTemplate, baselineOutdated, blankMaterial, blankWork, calculateMaterial, defaultTemplates, deleteRoomAndWork, deleteWork, getWorkPlan, historicalRoomDependents, materialLetter, materialSchedule, meanProgress, recordProgress, startExecution, syncRoomWork, workNumber, workProgress, workQuantity } from './work-plan';
import type { Project, WorkUpdate } from './types';

function fixture(): Project {
  const p = { ...seedProjects()[0], id: 'work-project', rooms: [{ id: 'r', name: 'Ruang Utama', floor: 1, length: 5, width: 6, height: null, source: 'manual' as const, confirmed: false }] };
  const w = { ...blankWork('floor-1', 'r'), id: 'w', name: 'Keramik', materials: [
    { ...blankMaterial('Semen'), id: 'cement', mode: 'rate' as const, factor: 3 },
    { ...blankMaterial('Keramik'), id: 'tile', mode: 'coverage' as const, factor: 4, waste: 10, unit: 'dus' as const, specification: '1 m × 1 m; 4 m²/dus' },
    { ...blankMaterial('Pasir'), id: 'sand', unit: 'kuintal' as const, manualQuantity: 1 },
  ] };
  return { ...p, workPlan: { ...getWorkPlan(p), items: [w] } };
}
function update(p: Project, patch: Partial<Omit<WorkUpdate, 'id' | 'baselineId' | 'createdAt'>> = {}): Project {
  return recordProgress(p, { workId: 'w', status: 'in-progress', completedQuantity: 15, date: '2026-10-03', note: 'Pengukuran hari ini', responsible: '', usage: [{ materialId: 'cement', quantity: 12 }], ...patch });
}
test('5 × 6 geometric basis, editable rates, coverage and rounding, all requested units', () => {
  const p = fixture(), w = p.workPlan!.items[0];
  assert.equal(workQuantity(p, w).quantity, 30);
  assert.match(workQuantity(p, w).rule, /tanpa pengurangan/);
  assert.equal(calculateMaterial(30, w.unit, w.materials[0]).raw, 90);
  const c = calculateMaterial(30, w.unit, w.materials[1]);
  assert.equal(c.raw, 8.25); assert.equal(c.procurement, 9);
  assert.equal(calculateMaterial(30, w.unit, w.materials[2]).procurement, 1);
  for (const unit of ['kg', 'kuintal', 'm', 'm²', 'm³', 'lembar', 'buah', 'dus'] as const) {
    const m = { ...blankMaterial('Manual'), unit, manualQuantity: 1.125, packageSize: null, ...(unit === 'dus' ? { boxContents: 4, boxContentsUnit: 'buah' as const } : {}) };
    assert.equal(calculateMaterial(30, 'm²', m).procurement, ['lembar', 'buah', 'dus'].includes(unit) ? 2 : 1.125);
  }
  assert.equal(calculateMaterial(30, 'm²', { ...w.materials[0], packageSize: 25 }).procurement, 100);
  assert.equal(calculateMaterial(30, 'm²', { ...w.materials[0], overrideQuantity: 12.5, overrideReason: 'Survei pengguna' }).procurement, 12.5);
});
test('missing/invalid rules and mismatched dimensions fail explicitly, including overflow', () => {
  const m = { ...blankMaterial('Keramik'), mode: 'coverage' as const, unit: 'dus' as const };
  for (const factor of [null, 0, -1, Infinity, NaN]) assert.throws(() => calculateMaterial(30, 'm²', { ...m, factor }), /cakupan/);
  assert.throws(() => calculateMaterial(30, 'm', { ...m, factor: 4 }), /tidak cocok/);
  assert.throws(() => calculateMaterial(30, 'm²', { ...m, unit: 'kg', factor: 4 }), /cakupan/);
  assert.throws(() => calculateMaterial(30, 'm²', { ...blankMaterial('Dus'), unit: 'dus', manualQuantity: 10 }), /Dus manual/);
  assert.throws(() => calculateMaterial(30, 'm²', { ...m, factor: 4, waste: -1 }), /Susut/);
  assert.throws(() => calculateMaterial(30, 'm²', { ...m, factor: 4, overrideQuantity: 10 }), /alasan/);
  assert.throws(() => calculateMaterial(Number.MAX_VALUE, 'm²', { ...m, factor: 0.0001 }), /batas/);
  assert.throws(() => calculateMaterial(Number.MIN_VALUE, 'm²', { ...m, mode: 'rate', unit: 'kg', factor: Number.MIN_VALUE }), /terlalu kecil/);
  assert.throws(() => workQuantity(fixture(), { ...fixture().workPlan!.items[0], unit: 'kg' }), /m²/);
});
test('rooftop explicit area never infers footprint and manual quantities support non-area work', () => {
  const p = fixture(), w = { ...blankWork('rooftop'), name: 'Atap' };
  assert.throws(() => workQuantity(p, w), /positif/);
  assert.equal(workQuantity(p, { ...w, quantity: 40 }).quantity, 40);
  assert.equal(workQuantity(p, { ...w, length: 5, width: 5 }).quantity, 25);
  assert.throws(() => workQuantity(p, { ...w, length: 5 }), /kedua/);
  assert.equal(workQuantity(p, { ...w, basis: 'manual', unit: 'buah', quantity: 7 }).quantity, 7);
});
test('templates are independent deep copies, numbering derived from order and letters exceed z', () => {
  const p = fixture(), templates = defaultTemplates();
  const a = applyTemplate(blankWork('floor-1', 'r'), templates[0]);
  const b = applyTemplate(blankWork('floor-1', 'r'), templates[0]);
  a.materials[0].factor = 9;
  assert.equal(templates[0].materials[0].factor, null); assert.equal(b.materials[0].factor, null);
  assert.notEqual(a.materials[0].id, b.materials[0].id);
  assert.equal(workNumber(p, p.workPlan!.items[0]), '1.1.1');
  assert.equal(materialLetter(26), 'aa');
  assert.equal(p.rooms[0].state, undefined);
});
test('baseline history, progress correction, overruns and unchanged save deduplication', () => {
  const p = startExecution(fixture()), initial = structuredClone(p.workPlan!.baselines[0]);
  assert.equal(startExecution(p), p);
  const q = update(p);
  assert.equal(workProgress(q.workPlan!, 'w'), 50);
  assert.equal(meanProgress(q.workPlan!, []), null);
  assert.equal(q.workPlan!.notifications.length, 2);
  assert.equal(update(q), q);
  const over = update(q, { completedQuantity: 40, status: 'completed', note: 'Lebih luas' });
  assert.ok(workProgress(over.workPlan!, 'w')! > 100);
  const corrected = update(over, { completedQuantity: 20, note: 'Koreksi pengukuran sebelumnya' });
  assert.equal(corrected.workPlan!.updates.length, 3);
  assert.deepEqual(corrected.workPlan!.baselines[0], initial);
  assert.throws(() => update(p, { completedQuantity: -1 }), /minimal 0/);
  assert.throws(() => update(p, { status: 'completed' }), /minimal rencana/);
  assert.throws(() => update(p, { status: 'not-started', completedQuantity: 0 }), /penggunaan/);
  assert.throws(() => update(p, { usage: [{ materialId: 'cement', quantity: -1 }] }), /Penggunaan/);
  assert.throws(() => update(p, { usage: [{ materialId: 'missing', quantity: 1 }] }), /Penggunaan/);
  const noUsage = update(p, { usage: [] });
  assert.deepEqual(noUsage.workPlan!.updates[0].usage, []);
});
test('dimension/rule edits require explicit baseline reason, preserving old quantities and updates', () => {
  let p = update(startExecution(fixture()));
  p = { ...p, rooms: [{ ...p.rooms[0], width: 8 }] };
  assert.ok(baselineOutdated(p));
  assert.throws(() => update(p), /kedaluwarsa/);
  assert.throws(() => startExecution(p, ' '), /Alasan/);
  const q = startExecution(p, 'Ukuran terbaru');
  assert.equal(q.workPlan!.baselines.length, 2);
  assert.equal(q.workPlan!.baselines[0].items[0].quantity, 30);
  assert.equal(q.workPlan!.baselines[1].items[0].quantity, 40);
  assert.equal(q.workPlan!.updates[0].completedQuantity, 15);
  assert.equal(workProgress(q.workPlan!, 'w'), 37.5);
  const bad = { ...q, workPlan: { ...q.workPlan!, items: [{ ...q.workPlan!.items[0], basis: 'manual' as const, unit: 'kg' as const, quantity: 30 }] } };
  assert.throws(() => startExecution(bad, 'Ganti satuan'), /tidak boleh diubah/);
});
test('material aggregation separates specifications, units and explicit dus coverage', () => {
  const p = fixture(), w = p.workPlan!.items[0];
  p.workPlan!.items.push({ ...w, id: 'w2', materials: [
    { ...w.materials[0], id: 'c2', specification: 'Semen berbeda' },
    { ...w.materials[2], id: 's2', unit: 'kg', manualQuantity: 100 },
    { ...w.materials[1], id: 't2', factor: 2 },
  ] });
  const schedule = materialSchedule(p);
  assert.equal(schedule.rows.length, 6); assert.equal(schedule.errors.length, 0);
  assert.equal(materialSchedule(p, ['w']).rows.length, 3);
});
test('backup round trips, duplicate remapping and validation preserve work relationships', () => {
  const p = update(startExecution(fixture()));
  assert.deepEqual(parseBackup(JSON.stringify(projectJson(p)))[0], JSON.parse(JSON.stringify(p)));
  assert.equal(parseBackup(JSON.stringify(projectsJson([p])))[0].workPlan!.updates.length, 1);
  let n = 0;
  const q = prepareImport([p], [p], 'copy', () => `fresh-${++n}`).projects[0];
  assert.notEqual(q.workPlan!.items[0].id, 'w');
  assert.equal(q.workPlan!.items[0].roomId, q.rooms[0].id);
  assert.equal(q.workPlan!.updates[0].workId, q.workPlan!.items[0].id);
  assert.equal(q.workPlan!.updates[0].baselineId, q.workPlan!.baselines[0].id);
  assert.equal(q.workPlan!.updates[0].usage[0].materialId, q.workPlan!.items[0].materials[0].id);
  assert.equal(q.workPlan!.notifications[0].workId, q.workPlan!.items[0].id);
  assert.equal(baselineOutdated(q), false);
  for (const mutate of [
    (x: Project) => { x.workPlan!.items[0].roomId = 'missing'; },
    (x: Project) => { x.workPlan!.updates[0].baselineId = 'missing'; },
    (x: Project) => { x.workPlan!.updates[0].usage[0].materialId = 'missing'; },
    (x: Project) => { x.workPlan!.notifications[0].workId = 'missing'; },
    (x: Project) => { x.workPlan!.updates[0].completedQuantity = -1; },
    (x: Project) => { x.workPlan!.items[0].materials.push(x.workPlan!.items[0].materials[0]); },
  ]) {
    const bad = structuredClone(p); mutate(bad);
    assert.throws(() => parseBackup(JSON.stringify(projectJson(bad))), /rencana pekerjaan|Format/);
  }
});
test('room floor edits retain history; confirmed work deletion removes attached references not templates', () => {
  const p = update(startExecution(fixture()));
  const moved = syncRoomWork({ ...p, rooms: [{ ...p.rooms[0], floor: 2 }] });
  assert.equal(moved.workPlan!.items[0].groupId, 'floor-2');
  assert.doesNotThrow(() => parseBackup(JSON.stringify(projectJson(moved))));
  const q = deleteWork(p, ['w']);
  assert.equal(q.workPlan!.items.length, 0);
  assert.equal(q.workPlan!.baselines[0].items.length, 0);
  assert.equal(q.workPlan!.updates.length, 0);
  assert.equal(q.workPlan!.notifications.some((n) => n.workId), false);
  assert.equal(q.workPlan!.templates.length, p.workPlan!.templates.length);
});
test('reassigned work blocks former room deletion and retains restorable baseline references', () => {
  let p = update(startExecution(fixture()));
  p = { ...p, rooms: [...p.rooms, { ...p.rooms[0], id: 'room-b', name: 'Ruang B' }],
    workPlan: { ...p.workPlan!, items: p.workPlan!.items.map((w) => ({ ...w, roomId: 'room-b' })) } };
  assert.equal(historicalRoomDependents(p, 'r')[0].id, 'w');
  assert.throws(() => deleteRoomAndWork(p, 'r'), /baseline lama.*dipindahkan/);
  p = startExecution(p, 'Pekerjaan dipindahkan ke ruang B');
  assert.throws(() => deleteRoomAndWork(p, 'r'), /baseline lama/);
  const restored = parseBackup(JSON.stringify(projectJson(p)))[0];
  assert.equal(restored.workPlan!.items[0].roomId, 'room-b');
  assert.equal(restored.workPlan!.baselines[0].items[0].work.roomId, 'r');
  let n = 0;
  const copy = prepareImport([p], [p], 'copy', () => `reassigned-${++n}`).projects[0];
  assert.equal(copy.workPlan!.items[0].roomId, copy.rooms[1].id);
  assert.equal(copy.workPlan!.baselines[0].items[0].work.roomId, copy.rooms[0].id);
  assert.equal(copy.workPlan!.baselines[1].items[0].work.roomId, copy.rooms[1].id);
  assert.equal(baselineOutdated(copy), false);
  assert.throws(() => deleteRoomAndWork(copy, copy.rooms[0].id), /baseline lama/);
  const clean = deleteRoomAndWork(deleteWork(p, ['w']), 'r');
  assert.equal(clean.rooms.length, 1);
  assert.doesNotThrow(() => parseBackup(JSON.stringify(projectJson(clean))));
  const cleanCopy = prepareImport([clean], [clean], 'copy', () => `clean-${++n}`).projects[0];
  assert.equal(cleanCopy.rooms.length, 1);
  assert.equal(cleanCopy.workPlan!.items.length, 0);
});