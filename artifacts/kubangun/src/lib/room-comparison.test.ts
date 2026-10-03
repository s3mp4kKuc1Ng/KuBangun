import assert from 'node:assert/strict';
import { test } from 'node:test';
import { areaNumberLabel, areaPreviewGeometry } from './area-preview';
import { fixRoomLinks, geometricArea, roomDifference, roomPairs, roomState, roomStateSummary } from './room-comparison';
import { readiness } from './readiness';
import { seedProjects } from './seed';
import type { Room } from './types';

const room = (patch: Partial<Room> = {}): Room => ({
  id: 'r', name: 'Dapur', floor: 1, length: 3, width: 2, height: null,
  source: 'manual', confirmed: true, ...patch,
});
const before = room({ id: 'e', state: 'existing' });
const after = room({ id: 'p', state: 'proposed', length: 4, existingRoomId: 'e' });

test('negative and unchanged area differences use readable decimal labels', () => {
  assert.equal(areaNumberLabel(-3.5), '-3,5');
  assert.equal(areaNumberLabel(0), '0');
  assert.equal(areaNumberLabel(4.5), '4,5');
  assert.equal(areaNumberLabel(-46.66666666666667), '-46,66666667');
  assert.ok(!areaNumberLabel(-60).includes('E'));
  assert.ok(areaNumberLabel(-0.00001).includes('E'));
});

test('legacy records remain unknown without losing dimensions, evidence, or confirmation', () => {
  const old = room({ source: 'dokumen', documentId: 'doc' });
  const original = JSON.stringify(old);
  assert.equal(roomState(old), 'unknown');
  assert.deepEqual(roomPairs([old]), []);
  assert.equal(JSON.stringify(old), original);
  const restored: Room = JSON.parse(JSON.stringify({ ...old, state: roomState(old) }));
  assert.equal(restored.state, 'unknown');
  assert.equal(restored.documentId, 'doc');
  assert.equal(restored.length, 3);
  assert.equal(restored.confirmed, true);
});

test('matches only explicit room IDs, never names, floors, order, or source', () => {
  const unlinked = room({ id: 'p2', state: 'proposed' });
  const pairs = roomPairs([after, before, unlinked, room()]);
  assert.equal(pairs[0].existing?.id, 'e');
  assert.equal(pairs[0].proposed?.id, 'p');
  assert.equal(pairs[1].existing, undefined);
  assert.equal(pairs[1].proposed?.id, 'p2');
  assert.equal(pairs.length, 2);
});

test('computes signed increase, decrease, no change and decimal differences from raw dimensions', () => {
  const increase = roomDifference(before, after);
  assert.ok(increase);
  assert.equal(increase.before, 6);
  assert.equal(increase.after, 8);
  assert.equal(increase.delta, 2);
  assert.ok(Math.abs(increase.percent - 100 / 3) < 1e-12);
  assert.equal(roomDifference(after, before)?.delta, -2);
  assert.equal(roomDifference(after, before)?.percent, -25);
  assert.equal(roomDifference(before, { ...after, length: 3 })?.delta, 0);
  const diff = roomDifference(room({ length: 3.75, width: 2.5 }), room({ length: 4.25, width: 2.5 }));
  assert.equal(diff?.delta, 1.25);
  assert.equal(diff?.before, 9.375);
});

test('missing, broken or invalid states do not assume zero areas or produce deltas', () => {
  assert.equal(roomDifference(before, undefined), null);
  assert.equal(roomDifference(undefined, after), null);
  for (const length of [0, -1, NaN, Infinity, 1e308, 1e-300]) {
    const invalid = room({ length, width: length });
    assert.equal(geometricArea(invalid), null);
    assert.equal(roomDifference(before, invalid), null);
  }
  const broken = roomPairs([{ ...after, existingRoomId: 'gone' }]);
  assert.equal(broken[0].missingLink, true);
  assert.equal(broken[0].existing, undefined);
  assert.equal(roomPairs([{ ...before, state: 'unknown' }, after])[0].existing, undefined);
});

test('state totals are separate, include unknown records, and remain unavailable for invalid dimensions', () => {
  assert.deepEqual(roomStateSummary([before, after, room()]), [
    { state: 'existing', count: 1, area: 6 },
    { state: 'proposed', count: 1, area: 8 },
    { state: 'unknown', count: 1, area: 6 },
  ]);
  assert.equal(roomStateSummary([])[0].area, null);
  assert.equal(roomStateSummary([{ ...before, length: NaN }])[0].area, null);
});

test('deletion or reclassification clears links but keeps proposed dimensions and evidence', () => {
  const proposed = { ...after, documentId: 'doc', source: 'dokumen' as const };
  const deleted = fixRoomLinks([proposed])[0];
  assert.equal(deleted.existingRoomId, undefined);
  assert.equal(deleted.confirmed, false);
  assert.equal(deleted.length, 4);
  assert.equal(deleted.documentId, 'doc');
  assert.equal(fixRoomLinks([{ ...before, state: 'unknown' }, proposed])[1].existingRoomId, undefined);
  assert.equal(fixRoomLinks([before, proposed])[1].existingRoomId, 'e');
  const duplicates = fixRoomLinks([before, proposed, { ...after, id: 'duplicate' }]);
  assert.equal(duplicates[2].existingRoomId, undefined);
  assert.equal(fixRoomLinks([{ ...before, existingRoomId: 'e' }])[0].existingRoomId, undefined);
});

test('paired sketches preserve exact proportions on a shared scale', () => {
  const reference = { length: 4, width: 2 };
  const e = areaPreviewGeometry(before.length, before.width, reference);
  const p = areaPreviewGeometry(after.length, after.width, reference);
  assert.ok(e.valid && p.valid);
  assert.equal(e.mPerUnit, p.mPerUnit);
  assert.equal(e.h, p.h);
  assert.ok(Math.abs(e.w / p.w - 3 / 4) < 1e-12);
});

test('JSON roundtrip keeps explicit pairing and preliminary readiness flags unclassified records', () => {
  const project = { ...seedProjects()[1], rooms: [before, after, room()] };
  const restored = JSON.parse(JSON.stringify(project));
  assert.equal(roomPairs(restored.rooms)[0].existing?.id, 'e');
  assert.equal(roomDifference(roomPairs(restored.rooms)[0].existing, restored.rooms[1])?.delta, 2);
  assert.equal(readiness(restored).find((g) => g.key === 'roomstates')?.state, 'unknown');
  const unpaired = { ...project, rooms: [before] };
  assert.equal(readiness(unpaired).find((g) => g.key === 'roompairs')?.state, 'missing');
});