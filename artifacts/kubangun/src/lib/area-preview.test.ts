import assert from 'node:assert/strict';
import { test } from 'node:test';
import { areaPreviewGeometry, PREVIEW_VIEW } from './area-preview.ts';
import { numOrNull } from './format.ts';

test('rejects missing, invalid and non-positive dimensions', () => {
  for (const v of [undefined, null, '', '3', NaN, Infinity, -Infinity, 0, -1]) {
    assert.equal(areaPreviewGeometry(v, 3).valid, false);
    assert.equal(areaPreviewGeometry(3, v).valid, false);
  }
});

test('supports form decimals using the existing Indonesian parser', () => {
  const g = areaPreviewGeometry(numOrNull('3,75'), numOrNull('2.5'));
  assert.ok(g.valid);
  assert.equal(g.length, 3.75);
  assert.equal(g.width, 2.5);
  assert.ok(Math.abs(g.w / g.h - 1.5) < 1e-12);
  assert.equal(areaPreviewGeometry(numOrNull(''), numOrNull('Infinity')).valid, false);
});

test('auto-fits rectangles without altering proportions', () => {
  for (const [length, width] of [[3, 3], [9, 2], [2, 9], [0.001, 10], [10, 0.001], [1e6, 2e6]]) {
    const g = areaPreviewGeometry(length, width);
    assert.ok(g.valid);
    assert.ok(Math.abs((g.w / g.h) / (length / width) - 1) < 1e-12);
    assert.ok(g.x >= PREVIEW_VIEW.left);
    assert.ok(g.y >= PREVIEW_VIEW.top);
    assert.ok(g.x + g.w <= PREVIEW_VIEW.w - PREVIEW_VIEW.right + 1e-10);
    assert.ok(g.y + g.h <= PREVIEW_VIEW.h - PREVIEW_VIEW.bottom + 1e-10);
    assert.ok(Number.isFinite(g.mPerUnit) && g.mPerUnit > 0);
  }
});

test('handles arithmetic overflow and underflow explicitly', () => {
  assert.equal(areaPreviewGeometry(1e308, 1e308).valid, false);
  assert.equal(areaPreviewGeometry(1e-300, 1e-300).valid, false);
});

test('previews derive from updated records, with no stored geometry or migration', () => {
  const rooms = [{ id: 'old-room', length: 3.5, width: 3 }];
  const old = areaPreviewGeometry(rooms[0].length, rooms[0].width);
  assert.ok(old.valid);
  rooms[0].length = 7;
  const restored = JSON.parse(JSON.stringify(rooms)) as typeof rooms;
  const updated = areaPreviewGeometry(restored[0].length, restored[0].width);
  assert.ok(updated.valid);
  assert.ok(Math.abs(updated.w / updated.h - 7 / 3) < 1e-12);
  assert.notEqual(updated.w / updated.h, old.w / old.h);
  assert.equal(restored.filter((r) => r.id !== 'old-room').length, 0);
});