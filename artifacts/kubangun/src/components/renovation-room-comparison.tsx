import { areaNumberLabel } from '@/lib/area-preview';
import { downloadAreaSketch } from '@/lib/area-sketch-export';
import { ROOM_STATE_LABEL, geometricArea, roomDifference, roomPairs, roomState, roomStateSummary } from '@/lib/room-comparison';
import type { Room } from '@/lib/types';
import { AreaPreview } from './area-preview';

const number = (n: number) => areaNumberLabel(n);
const signed = (n: number) => `${n > 0 ? '+' : ''}${number(n)}`;

export function RenovationRoomComparison({ rooms, testId = 'renovation-room-comparison', downloads = false }: { rooms: Room[]; testId?: string; downloads?: boolean }) {
  const pairs = roomPairs(rooms);
  const unknown = rooms.filter((r) => roomState(r) === 'unknown');
  const sketch = (room: Room, state: 'existing' | 'proposed' | 'unknown', reference?: { length: number; width: number }) =>
    <AreaPreview name={`${ROOM_STATE_LABEL[state]} — ${room.name}`} floor={room.floor} length={room.length} width={room.width}
      reference={reference} testId={`${testId}-${state}-${room.id}`}
      onDownload={downloads ? () => downloadAreaSketch({ ...room, name: `${ROOM_STATE_LABEL[state]} — ${room.name}` }) : undefined} />;
  return <section className="space-y-3" data-testid={testId}>
    <h4 className="font-display text-lg font-bold">Perbandingan luas ruang: eksisting dan usulan</h4>
    <p className="text-xs text-muted-foreground">Pasangan ditautkan secara eksplisit di tab Ruang. Ukuran dan lantai diisi pengguna, bukan hasil ekstraksi atau rancangan otomatis. Selisih = usulan − eksisting; bukan penilaian keselamatan atau kecukupan struktur.</p>
    <div className="grid sm:grid-cols-3 gap-2 text-xs">
      {roomStateSummary(rooms).map((s) => <div key={s.state} className="border border-border p-2" data-testid={`${testId}-total-${s.state}`}>
        <b>{ROOM_STATE_LABEL[s.state]}</b>: {s.count} ruang / {s.area === null ? 'luas belum tersedia' : `${number(s.area)} m²`}
      </div>)}
    </div>
    <p className="text-xs text-muted-foreground">Total per keadaan hanya mencakup ruang tercatat, bukan luas total bangunan. Tidak ada selisih total untuk daftar yang belum lengkap atau belum dipasangkan.</p>
    {!pairs.length && <p className="text-sm">Belum ada ruang berlabel eksisting atau usulan. Tambahkan atau tentukan keadaan ruang di tab Ruang.</p>}
    {pairs.map(({ key, existing, proposed, missingLink }) => {
      const diff = roomDifference(existing, proposed);
      const reference = existing && proposed && geometricArea(existing) !== null && geometricArea(proposed) !== null
        ? { length: Math.max(existing.length, proposed.length), width: Math.max(existing.width, proposed.width) } : undefined;
      return <div key={key} className="border border-border p-3 break-inside-avoid space-y-2" data-testid={`${testId}-pair-${key}`}>
        <div className="font-medium text-sm">{existing?.name ?? proposed?.name}{existing && proposed && existing.name !== proposed.name ? ` → ${proposed.name}` : ''}</div>
        <div className="area-preview-grid grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3">
          {existing ? sketch(existing, 'existing', reference) : <div className="border border-dashed border-border p-4 text-sm"><b>Eksisting</b><p>{missingLink ? 'Ruang eksisting tertaut tidak tersedia. Pilih ulang pasangan.' : 'Belum ditautkan; luas eksisting tidak diasumsikan nol.'}</p></div>}
          {proposed ? sketch(proposed, 'proposed', reference) : <div className="border border-dashed border-border p-4 text-sm"><b>Usulan</b><p>Belum dicatat atau ditautkan; luas usulan tidak diasumsikan nol.</p></div>}
        </div>
        <p className="font-mono text-sm" data-testid={`${testId}-difference-${key}`}>
          {diff ? `Eksisting ${number(diff.before)} m² / Usulan ${number(diff.after)} m² / Selisih ${signed(diff.delta)} m² (${signed(diff.percent)}%)`
            : 'Selisih belum tersedia: diperlukan pasangan dengan ukuran valid pada kedua keadaan.'}
        </p>
        {reference && <p className="text-xs text-muted-foreground">Kedua sketsa memakai skala tampilan yang sama. Orientasi panjang/lebar mengikuti isian; bukan denah posisi atau skala cetak.</p>}
        {existing && proposed && existing.floor !== proposed.floor && <p className="text-xs text-muted-foreground">Pasangan ini berada pada lantai berbeda sesuai isian pengguna: eksisting lantai {existing.floor}, usulan lantai {proposed.floor}.</p>}
      </div>;
    })}
    {unknown.length > 0 && <div className="space-y-2" data-testid={`${testId}-unknown`}>
      <h5 className="font-bold text-sm">Keadaan belum ditentukan ({unknown.length})</h5>
      <p className="text-xs text-muted-foreground">Catatan lama tetap disimpan tanpa dianggap eksisting atau usulan. Ubah ruang untuk menentukan keadaan dan pasangan; catatan ini tidak ikut menghitung selisih.</p>
      <div className="grid sm:grid-cols-2 gap-3">{unknown.map((r) => <div key={r.id}>{sketch(r, 'unknown')}</div>)}</div>
    </div>}
  </section>;
}