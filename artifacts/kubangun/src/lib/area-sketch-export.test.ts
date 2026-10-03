import assert from 'node:assert/strict';
import { test } from 'node:test';
import { areaSketchExport, downloadAreaSketch } from './area-sketch-export';
import { areaPreviewGeometry } from './area-preview';

const room = { name: 'Dapur & ruang <makan> "utama"', floor: 2, length: 3.75, width: 2.5 };

test('standalone SVG contains escaped identity, floor, units and limitations', () => {
  const { svg, filename } = areaSketchExport(room);
  assert.ok(svg.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  for (const text of [
    'xmlns="http://www.w3.org/2000/svg"', 'Dapur &amp; ruang &lt;makan&gt; &quot;utama&quot;',
    'Lantai 2', 'meter (m)', 'P 3,75 m', 'L 2,5 m', '9,375 m²',
    'bukan skala cetak', 'skala arsitektur tetap', 'Bukan verifikasi profesional',
    'letak antarruang', 'eksisting/usulan', 'kecukupan struktur',
  ]) assert.ok(svg.includes(text), text);
  assert.ok(!svg.includes('var(--') && !svg.includes('href=') && !svg.includes('<script'));
  assert.equal(filename, 'kubangun-sketsa-dapur-ruang-makan-utama-lantai-2.svg');
});

test('export uses exact preview geometry including thin and extreme proportions', () => {
  for (const [length, width] of [[3, 3], [9, 2], [2, 9], [0.001, 10], [10, 0.001], [1e100, 2e100]]) {
    const g = areaPreviewGeometry(length, width);
    assert.ok(g.valid);
    const { svg } = areaSketchExport({ ...room, length, width });
    assert.ok(svg.includes(`x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}"`));
    assert.ok(svg.includes('viewBox="0 0 360 240"'));
    if (Math.min(g.w, g.h) < 1) assert.ok(svg.includes('Sisi sangat tipis'));
  }
});

test('long names wrap without clipping or truncation and increase canvas height', () => {
  const short = areaSketchExport(room).svg;
  const long = areaSketchExport({ ...room, name: 'W'.repeat(140) }).svg;
  const nameTexts = [...long.matchAll(/font-weight="bold"[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
  assert.equal(nameTexts.join(''), 'W'.repeat(140));
  assert.ok(nameTexts.every((s) => s.length <= 32));
  const height = (s: string) => Number(s.match(/height="(\d+)"/)?.[1]);
  assert.ok(height(long) > height(short));
});

test('invalid dimensions fail explicitly; updated records export current data', () => {
  for (const length of [0, -1, NaN, Infinity, 1e308]) {
    assert.throws(() => areaSketchExport({ ...room, length, width: length }));
  }
  assert.ok(areaSketchExport({ ...room, length: 7 }).svg.includes('P 7 m'));
  assert.ok(areaSketchExport({ ...room, floor: NaN }).svg.includes('Lantai belum valid'));
});

test('download reuses the browser export utility with an SVG blob and safe filename', async () => {
  let blob: Blob | undefined;
  let clicked = false, removed = false, appended = false;
  const anchor = { href: '', download: '', click: () => { clicked = true; }, remove: () => { removed = true; } };
  const originalDocument = globalThis.document;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let revoked = '';
  try {
    globalThis.document = { createElement: () => anchor, body: { appendChild: () => { appended = true; } } } as unknown as Document;
    URL.createObjectURL = (value) => { blob = value as Blob; return 'blob:sketch-test'; };
    URL.revokeObjectURL = (url) => { revoked = url; };
    downloadAreaSketch(room);
    assert.equal(blob?.type, 'image/svg+xml;charset=utf-8');
    assert.equal(anchor.download, areaSketchExport(room).filename);
    assert.equal(anchor.href, 'blob:sketch-test');
    assert.ok(clicked && removed && appended);
    assert.equal(await blob?.text(), areaSketchExport(room).svg);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    assert.equal(revoked, 'blob:sketch-test');
  } finally {
    globalThis.document = originalDocument;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
});