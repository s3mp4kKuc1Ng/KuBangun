import { Download } from 'lucide-react';
import { areaPreviewGeometry, areaNumberLabel as numberLabel, areaMeterLabel as m } from '@/lib/area-preview';
import { numOrNull } from '@/lib/format';
import { AreaSketch } from './area-sketch';
import { Btn } from './kit';

type V = number | string | null | undefined;
const toNum = (v: V) => (typeof v === 'string' ? numOrNull(v) : v == null ? null : v);

export function AreaPreview({ name, floor, length, width, testId, onDownload, reference }: { name?: string; floor?: V; length: V; width: V; testId?: string; onDownload?: () => void; reference?: { length: number; width: number } }) {
  const l = toNum(length), w = toNum(width);
  const g = areaPreviewGeometry(l ?? undefined, w ?? undefined, reference);
  const fl = toNum(floor);
  return (
    <figure className="area-preview border border-border bg-card p-2 break-inside-avoid" data-testid={testId}>
      {g.valid ? (
        <AreaSketch geometry={g} className="w-full max-w-sm h-auto block mx-auto" />
      ) : (
        <div className="text-xs text-muted-foreground p-3 text-center border border-dashed border-border" role="status">Sketsa belum tersedia. {g.reason}</div>
      )}
      <figcaption className="text-xs mt-2 space-y-0.5">
        {name?.trim() && <div className="font-medium break-words" data-i18n="off">{name}</div>}
        <div className="font-mono text-muted-foreground break-words">
          {fl != null && Number.isInteger(fl) && fl > 0 ? `Lantai ${fl}` : 'Lantai belum valid'}
          {g.valid && ` / Luas geometris ${numberLabel(g.length * g.width)} m²`}
        </div>
        {g.valid && <div className="font-mono text-muted-foreground break-words">Panjang {m(g.length)} × lebar {m(g.width)}</div>}
        {g.valid && Math.min(g.w, g.h) < 1 && <div className="text-muted-foreground">Sisi sangat tipis pada skala layar; proporsi asli tetap dipertahankan. Baca ukuran pada label.</div>}
        <div className="text-muted-foreground">Sketsa persegi panjang otomatis, skala menyesuaikan layar (bukan skala cetak). Hanya ilustrasi ukuran isian; tidak menunjukkan letak antarruang atau kecukupan struktur. Label keadaan, bila ada, ditentukan pengguna.</div>
      </figcaption>
      {onDownload && <Btn sm className="mt-2" disabled={!g.valid} onClick={onDownload} aria-label={`Unduh sketsa SVG ${name ?? 'area'}`} data-testid={`button-download-${testId}`}><Download size={14} />Unduh sketsa SVG</Btn>}
    </figure>
  );
}
