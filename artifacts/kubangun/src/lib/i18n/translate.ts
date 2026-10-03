import { messages } from './messages';
import { workspaceMessages } from './workspace-messages';
import { workMessages } from './work-messages';
import { reportMessages } from './report-messages';
import { errorMessages } from './error-messages';
import { getLanguage, type Language } from './language';

export const catalog = { ...messages, ...workspaceMessages, ...workMessages, ...reportMessages, ...errorMessages };
const patterns: [RegExp, string][] = [
  [/^Halo, (.+)$/, 'Hello, $1'],
  [/^Notifikasi lokal \((\d+)\)$/, 'Local notifications ($1)'],
  [/^Revisi (\d+)$/, 'Revision $1'],
  [/^Lihat semua (\d+) proyek$/, 'View all $1 projects'],
  [/^\(lebar retak terukur (.+) mm\)$/, '(measured crack width $1 mm)'],
  [/^\(usulan: (.+)\)$/, '(proposed: $1)'],
  [/^(.+) melebihi baseline$/, '$1 exceeds baseline'],
  [/^Lt\.? (\d+)$/, 'Floor $1'],
  [/^Lantai (\d+)$/, 'Floor $1'],
  [/^Lantai (\d+) · Satuan: meter \(m\)$/, 'Floor $1 · Units: metres (m)'],
  [/^Catat progres — (.+)$/, 'Record progress — $1'],
  [/^Riwayat — (.+)$/, 'History — $1'],
  [/^Selesai kumulatif \((.+)\)$/, 'Cumulative completed ($1)'],
  [/^Pengadaan baseline (.+)$/, 'Baseline procurement $1'],
  [/^Cakupan manual per dus \((.+), opsional\)$/, 'Manual coverage per box ($1, optional)'],
  [/^Jumlah manual \((.+)\)$/, 'Manual quantity ($1)'],
  [/^Kelipatan pembulatan pengadaan \((.+), opsional\)$/, 'Procurement rounding multiple ($1, optional)'],
  [/^Kuantitas rencana \((.+)\)$/, 'Planned quantity ($1)'],
  [/^(\d+) dari (\d+) ruang belum dikonfirmasi pengguna\.$/, '$1 of $2 rooms are not user-confirmed.'],
  [/^(\d+) dari (\d+) komponen belum dikonfirmasi pengguna\.$/, '$1 of $2 components are not user-confirmed.'],
  [/^(\d+) komponen bermaterial tidak diketahui\.$/, '$1 components have unknown materials.'],
  [/^(\d+) dari (\d+) dokumen hanya metadata; isi berkas belum tersedia\. Pasok berkas asli di tab Dokumen\.$/, '$1 of $2 documents have metadata only; file contents are unavailable. Supply original files in Documents.'],
  [/^(\d+) berkas tersimpan lokal\. Ekstraksi otomatis dinonaktifkan\.$/, '$1 files stored locally. Automatic extraction is disabled.'],
  [/^(\d+) ruang belum ditentukan keadaannya; tidak dianggap eksisting atau usulan\.$/, '$1 rooms have unspecified states; they are not treated as existing or proposed.'],
  [/^(\d+) pasangan belum lengkap\/valid; selisih luas tidak tersedia\. Ruang baru atau dihapus boleh tetap tidak berpasangan\.$/, '$1 pairs are incomplete/invalid; area differences are unavailable. New or removed rooms may remain unpaired.'],
  [/^(\d+) observasi tercatat; tanpa penafsiran penyebab\.$/, '$1 observations recorded; causes are not interpreted.'],
  [/^(\d+) perubahan diusulkan\. Peran struktural elemen perlu evaluasi profesional\.$/, '$1 changes proposed. Structural roles require professional evaluation.'],
  [/^Panjang (.+) × lebar (.+)$/, 'Length $1 × width $2'],
  [/^Luas geometris (.+) m² \(bukan luas terverifikasi\)\.$/, 'Geometric area $1 m² (not verified area).'],
  [/^Sketsa area: (.+)$/, 'Area sketch: $1'],
  [/^Sketsa denah atas persegi panjang (.+) kali (.+)\. Skala otomatis menyesuaikan, bukan skala cetak\.$/, 'Rectangular top-view sketch $1 by $2. Automatically scaled, not a print scale.'],
  [/^(.+) m × (.+) m \(lantai penuh; tanpa pengurangan renovasi\)$/, '$1 m × $2 m (full floor; no renovation deductions)'],
  [/^(.+) m × (.+) m \(dimensi kerja eksplisit\)$/, '$1 m × $2 m (explicit work dimensions)'],
  [/^Gagal membaca IndexedDB: (.+)$/, 'Could not read IndexedDB: $1'],
  [/^Sebagian berkas lokal gagal dihapus dari IndexedDB: (.+)$/, 'Some local files could not be deleted from IndexedDB: $1'],
  [/^Unduh sketsa SVG (.+)$/, 'Download SVG sketch $1'],
  [/^Gagal menyimpan ke localStorage: (.+)\. Perubahan tidak disimpan; data dan notifikasi sebelumnya tetap dipertahankan\. Periksa ruang penyimpanan dan coba lagi\.$/, 'Could not save to localStorage: $1. Changes were not saved; previous data and notifications are retained. Check storage space and try again.'],
  [/^Gagal menyimpan pengaturan: (.+)$/, 'Could not save settings: $1'],
  [/^Gagal memeriksa penyimpanan lokal: (.+)$/, 'Could not check local storage: $1'],
  [/^Data lokal tidak dapat dibaca \((.+)\)\. Contoh proyek dimuat; data lama tidak ditimpa sampai Anda menyimpan perubahan\.$/, 'Local data could not be read ($1). Example projects were loaded; old data is not overwritten until you save changes.'],
];

export function translate(source: string, language: Language = getLanguage()): string {
  if (language === 'id') return source;
  const key = source.replace(/\s+/g, ' ').trim();
  const result = Object.prototype.hasOwnProperty.call(catalog, key) ? catalog[key] : undefined;
  const leading = source.match(/^\s*/)?.[0] ?? '';
  const trailing = source.match(/\s*$/)?.[0] ?? '';
  if (result !== undefined) return leading + result + trailing;
  for (const prefix of ['Belum diisi. ', 'Diisi manual. ', 'Galat: ']) {
    if (key.startsWith(prefix.trim()) && key.length > prefix.length)
      return leading + (prefix === 'Galat: ' ? 'Error: ' : translate(prefix, language)) + translate(key.slice(prefix.length), language) + trailing;
  }
  for (const [pattern, replacement] of patterns) if (pattern.test(key))
    return leading + key.replace(pattern, replacement) + trailing;
  const positive = key.match(/^(.+) harus angka positif( bulat)?\.$/);
  if (positive) return leading + translate(positive[1], language) + ' must be a positive ' + (positive[2] ? 'whole ' : '') + 'number.' + trailing;
  const invalid = key.match(/^(.+): "(.+)" bukan angka (?:yang )?valid\.$/);
  if (invalid) return leading + translate(invalid[1], language) + ': "' + invalid[2] + '" is not a valid number.' + trailing;
  // Only localize generated calculation grammar, never the authored override reason.
  if (/^(?:Manual: [-+\d.e]+ |[-+\d.e]+ (?:kg|kuintal|m[²³]?|lembar|buah|dus) × )/.test(key)) {
    const reasonAt = key.indexOf(': ', key.indexOf('; override ') >= 0 ? key.indexOf('; override ') : key.length);
    const fixed = reasonAt < 0 ? key : key.slice(0, reasonAt);
    const reason = reasonAt < 0 ? '' : key.slice(reasonAt);
    return leading + fixed
      .replace('(susut tidak diterapkan)', '(waste not applied)')
      .replace('; isi dus: ', '; box contents: ')
      .replace('; cakupan: ', '; coverage: ')
      .replace('; dibulatkan ke kelipatan ', '; rounded to multiples of ')
      .replace('; massa/volume/panjang tidak dibulatkan (tampilan 3 desimal)', '; mass/volume/length not rounded (displayed to 3 decimals)')
      .replace(/\b(kuintal|lembar|buah|dus)\b/g, (unit) => catalog[unit]) + reason + trailing;
  }
  const quantity = key.match(/^([-+\d.,e]+) (kuintal|lembar|buah|dus)$/);
  if (quantity) return leading + quantity[1] + ' ' + catalog[quantity[2]] + trailing;
  return source;
}