import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { jsx, Fragment } from './i18n/jsx-runtime';
import { getLocale, updateLanguage } from './i18n/language';
import { translate } from './i18n/translate';
import { areaSketchExport } from './area-sketch-export';
import { displayQuantity } from './work-plan';

test('translation keeps Indonesian as default and localizes complete dynamic messages', () => {
  assert.equal(translate('Simpan', 'id'), 'Simpan');
  assert.equal(translate('  Simpan  ', 'en'), '  Save  ');
  assert.equal(translate('Belum diisi. Perkiraan.', 'en'), 'Not entered. Estimate.');
  assert.equal(translate('2 dari 5 ruang belum dikonfirmasi pengguna.', 'en'), '2 of 5 rooms are not user-confirmed.');
  assert.equal(translate('Jumlah lantai harus angka positif bulat.', 'en'), 'Number of floors must be a positive whole number.');
  assert.equal(translate('Halo, Draf', 'en'), 'Hello, Draf');
  assert.equal(translate('toString', 'en'), 'toString');
  assert.equal(translate('__proto__', 'en'), '__proto__');
  assert.equal(translate('Manual: 10 dus (susut tidak diterapkan); dibulatkan ke kelipatan 1 dus; override 12 dus: Draf', 'en'), 'Manual: 10 box (waste not applied); rounded to multiples of 1 box; override 12 box: Draf');
});

test('rendering translates fragments and keeps option values and authored content intact', () => {
  updateLanguage('en');
  try {
    const option = renderToStaticMarkup(jsx('option', { children: 'Dinding' }));
    assert.match(option, /value="Dinding"/);
    assert.match(option, />Wall</);
    const raw = renderToStaticMarkup(jsx('span', { 'data-i18n': 'off', children: jsx('b', { children: 'Draf' }) }));
    assert.match(raw, />Draf</);
    assert.doesNotMatch(raw, /Draft/);
    assert.match(renderToStaticMarkup(jsx(Fragment, { children: ['Hapus', jsx('b', { 'data-i18n': 'off', children: 'Draf' }, 'name')] })), /Delete/);
  } finally { updateLanguage('id'); }
});

test('English quantities and SVG exports use the locale without changing room names', () => {
  updateLanguage('en');
  try {
    assert.equal(getLocale(), 'en-GB');
    assert.equal(displayQuantity(1234.5), '1,234.5');
    const output = areaSketchExport({ name: 'Draf', floor: 1, length: 3.5, width: 2 });
    assert.match(output.svg, /Area dimension sketch/);
    assert.match(output.svg, /Length 3.5 m × width 2 m/);
    assert.match(output.svg, /not verified area/);
    assert.match(output.svg, />Draf</);
    assert.equal(output.filename, 'kubangun-sketsa-draf-lantai-1.svg');
  } finally { updateLanguage('id'); }
  assert.equal(displayQuantity(1234.5), '1.234,5');
});