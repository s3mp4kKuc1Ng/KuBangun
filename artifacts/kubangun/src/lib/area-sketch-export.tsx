import { renderToStaticMarkup } from 'react-dom/server';
import { AreaSketch } from '../components/area-sketch';
import { areaPreviewGeometry, areaMeterLabel, areaNumberLabel } from './area-preview';
import { downloadText, slug } from './export';
import type { Room } from './types';
import { translate } from './i18n/translate';

type SketchRoom = Pick<Room, 'name' | 'floor' | 'length' | 'width'>;

// Wrap even unbroken names; never truncate the identity of a shared area.
function nameLines(name: string) {
  const chars = Array.from(name.replace(/\s+/g, ' ').trim() || translate('Area tanpa nama'));
  const lines: string[] = [];
  while (chars.length) lines.push(chars.splice(0, 32).join(''));
  return lines;
}

export function areaSketchExport(room: SketchRoom) {
  const g = areaPreviewGeometry(room.length, room.width);
  if (!g.valid) throw new Error(`Sketsa tidak dapat diunduh. ${g.reason}`);
  const names = nameLines(room.name);
  const headerHeight = 60 + names.length * 24;
  const notes = [
    `Panjang ${areaMeterLabel(g.length)} × lebar ${areaMeterLabel(g.width)}`,
    `Luas geometris ${areaNumberLabel(g.length * g.width)} m² (bukan luas terverifikasi).`,
    ...(Math.min(g.w, g.h) < 1 ? ['Sisi sangat tipis; proporsi asli dipertahankan. Baca ukuran pada label.'] : []),
    'Sketsa persegi panjang otomatis dari ukuran isian; satuan meter (m).',
    'Skala menyesuaikan tampilan; bukan skala cetak atau skala arsitektur tetap.',
    'Tidak menunjukkan letak antarruang atau bukaan; label eksisting/usulan diisi pengguna.',
    'Bukan verifikasi profesional, gambar kerja, atau penilaian kecukupan struktur.',
  ].map((note) => translate(note));
  const height = headerHeight + 480 + 30 + notes.length * 24;
  const svg = renderToStaticMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height={height} viewBox={`0 0 720 ${height}`} role="img" aria-labelledby="title description">
      <title id="title">{`Sketsa area: ${room.name}`}</title>
      <desc id="description">{notes.join(' ')}</desc>
      <rect width="720" height={height} fill="#ffffff" />
      <g fontFamily="Arial, sans-serif" fill="#17202a">
        <text x="24" y="28" fontSize="14">KuBangun — Sketsa dimensi area</text>
        {names.map((line, i) => <text key={i} x="24" y={56 + i * 24} fontSize="20" fontWeight="bold" data-i18n="off">{line}</text>)}
        <text x="24" y={headerHeight - 8} fontSize="14">{Number.isInteger(room.floor) && room.floor > 0 ? `Lantai ${room.floor}` : 'Lantai belum valid'} · Satuan: meter (m)</text>
        <AreaSketch geometry={g} standalone x="0" y={headerHeight} width="720" height="480" />
        {notes.map((line, i) => <text key={i} x="24" y={headerHeight + 500 + i * 24} fontSize="14">{line}</text>)}
      </g>
    </svg>,
  );
  return {
    svg: `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`,
    filename: `kubangun-sketsa-${slug(room.name)}-lantai-${Number.isInteger(room.floor) && room.floor > 0 ? room.floor : 'tidak-diketahui'}.svg`,
  };
}

export function downloadAreaSketch(room: SketchRoom) {
  const { filename, svg } = areaSketchExport(room);
  downloadText(filename, svg, 'image/svg+xml;charset=utf-8');
}