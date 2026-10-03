import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup, prepareImport } from './import';
import { projectJson } from './export';
import { seedProjects } from './seed';
import { readiness } from './readiness';
import type { Project } from './types';

const timestamp = '2026-01-01T00:00:00.000Z';
function fixture(): Project {
  return {
    ...seedProjects()[1], id: 'restore', revision: 7, status: 'review-requested',
    reviewRequestedAt: timestamp, reviewRequestedRevision: 7,
    rooms: [
      { id: 'e', name: 'Eksisting', floor: 1, length: 3, width: 4, height: null, source: 'dokumen', documentId: 'doc', confirmed: true, state: 'existing' },
      { id: 'p', name: 'Usulan', floor: 1, length: 4, width: 4, height: 3, source: 'manual', confirmed: false, state: 'proposed', existingRoomId: 'e' },
      { id: 'legacy', name: 'Eksisting lama', floor: 1, length: 2, width: 3, height: null, source: 'manual', confirmed: true },
    ],
    documents: [{ id: 'doc', name: 'survey.pdf', mime: 'application/pdf', size: 100, uploadedAt: timestamp, sourceState: 'existing' }],
    components: [{ id: 'c', name: 'Wall', type: 'wall', dimensions: '', material: '', state: 'existing', source: 'dokumen', documentId: 'doc', confirmed: false }],
    observations: [{ id: 'o', location: 'Wall', category: 'Retak', description: 'Catatan', date: '2026-01-01', photoDocumentId: 'doc' }],
    changes: [{ id: 'chg', type: 'Ubah', description: 'Wall', componentId: 'c', dimensions: '' }],
    reviewNotes: [{ id: 'note', text: 'Pendahuluan', revision: 6, createdAt: timestamp }],
  };
}
const all = (projects: Project[]) => JSON.stringify({ format: 'kubangun-all-v1', exportedAt: timestamp, projects });
const ids = () => { let i = 0; return () => `new-${++i}`; };

test('current single and all exports validate, including legacy rooms and seeds', () => {
  assert.deepEqual(parseBackup(JSON.stringify(projectJson(fixture()))), [fixture()]);
  assert.deepEqual(parseBackup(all(seedProjects())), seedProjects());
  assert.equal(parseBackup(all([fixture()]))[0].rooms[2].state, undefined);
});
test('restore keeps revisions, classifications, evidence and preliminary gaps without mutating input', () => {
  const p = fixture();
  const original = JSON.stringify(p);
  const result = prepareImport([], [p], 'skip', ids());
  const restored = result.projects[0];
  assert.equal(restored.revision, 7);
  assert.equal(restored.status, 'review-requested');
  assert.equal(restored.reviewRequestedRevision, 7);
  assert.deepEqual(restored.reviewNotes, p.reviewNotes);
  assert.equal(restored.rooms[1].existingRoomId, 'e');
  assert.equal(restored.rooms[2].state, undefined);
  assert.equal(restored.rooms[0].confirmed, true);
  assert.equal(restored.rooms[0].documentId, restored.documents[0].id);
  assert.equal(restored.components[0].documentId, restored.documents[0].id);
  assert.equal(restored.observations[0].photoDocumentId, restored.documents[0].id);
  assert.equal(restored.documents[0].availability, 'unavailable');
  assert.notEqual(restored.documents[0].id, 'doc');
  assert.equal(readiness(restored).find((x) => x.key === 'docs')?.state, 'missing');
  assert.equal(readiness(restored).find((x) => x.key === 'roomstates')?.state, 'unknown');
  assert.equal(JSON.stringify(p), original);
  assert.deepEqual(parseBackup(JSON.stringify(projectJson(restored))), [JSON.parse(JSON.stringify(restored))]);
});
test('skip is non-destructive; copy remaps all internal relationships and can be imported repeatedly', () => {
  const p = fixture();
  const other = { ...fixture(), id: 'other' };
  const skipped = prepareImport([p], [p, other], 'skip', ids());
  assert.equal(skipped.added, 1); assert.equal(skipped.skipped, 1);
  assert.equal(skipped.projects[1], p);
  const copied = prepareImport([p], [p], 'copy', ids()).projects[0];
  assert.notEqual(copied.id, p.id);
  assert.equal(copied.rooms[1].existingRoomId, copied.rooms[0].id);
  assert.equal(copied.changes[0].componentId, copied.components[0].id);
  assert.equal(copied.rooms[0].documentId, copied.documents[0].id);
  assert.equal(copied.revision, 7);
  const next = prepareImport([copied, p], [p], 'copy', ids()).projects;
  assert.equal(new Set(next.map((x) => x.id)).size, 3);
  assert.equal(new Set(next.flatMap((x) => x.documents.map((d) => d.id))).size, 3);
});
test('malformed schemas, unsupported versions and duplicate IDs are rejected', () => {
  assert.throws(() => parseBackup('{'), /JSON/);
  assert.throws(() => parseBackup('{"format":"kubangun-all-v2"}'), /Format/);
  assert.throws(() => parseBackup(JSON.stringify(fixture())), /Format/);
  assert.throws(() => parseBackup(all([])), /Format/);
  assert.throws(() => parseBackup(all([fixture(), fixture()])), /duplikat/);
  for (const patch of [{ revision: 0 }, { mode: 'other' }, { archived: 'true' }, { updatedAt: 'oops' }, { landArea: -1 }]) {
    assert.throws(() => parseBackup(all([{ ...fixture(), ...patch } as Project])), /Format/);
  }
  const p = fixture(); p.rooms.push({ ...p.rooms[0] });
  assert.throws(() => parseBackup(all([p])), /duplikat/);
});
test('broken, ambiguous and unclassified links are rejected rather than guessed', () => {
  for (const change of [
    (p: Project) => { p.rooms[1].existingRoomId = 'missing'; },
    (p: Project) => { p.rooms[0].state = undefined; },
    (p: Project) => { p.rooms[0].documentId = 'missing'; },
    (p: Project) => { p.changes[0].componentId = 'missing'; },
    (p: Project) => { p.observations[0].photoDocumentId = 'missing'; },
    (p: Project) => { p.rooms.push({ ...p.rooms[1], id: 'duplicate-pair' }); },
    (p: Project) => { p.reviewRequestedRevision = 8; },
  ]) {
    const p = fixture(); change(p);
    assert.throws(() => parseBackup(all([p])), /tautan|pasangan|revisi/);
  }
});
test('unknown labels and numeric strings never get silently coerced', () => {
  const p = fixture();
  assert.throws(() => parseBackup(all([{ ...p, rooms: [{ ...p.rooms[0], state: 'old' }] } as unknown as Project])), /Format/);
  assert.throws(() => parseBackup(all([{ ...p, floors: '1' } as unknown as Project])), /Format/);
});