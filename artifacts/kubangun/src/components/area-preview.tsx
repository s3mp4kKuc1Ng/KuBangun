import { areaPreviewGeometry } from '@/lib/area-preview';
import { numOrNull } from '@/lib/format';

type V = number | string | null | undefined;
const toNum = (v: V) => (typeof v === 'string' ? numOrNull(v) : v == null ? null : v);
const numberLabel = (n: number) => n.toLocaleString('id-ID', {
  useGrouping: false,
  maximumSignificantDigits: 10,
  notation: n < 0.001 || n >= 10000000 ? 'scientific' : 'standard',
});
const m = (n: number) => numberLabel(n) + ' m';

export function AreaPreview({ name, floor, length, width, testId }: { name?: string; floor?: V; length: V; width: V; testId?: string }) {
  const l = toNum(length), w = toNum(width);
  const g = areaPreviewGeometry(l ?? undefined, w ?? undefined);
  const fl = toNum(floor);
  return (
    <figure className="area-preview border border-border bg-card p-2 break-inside-avoid" data-testid={testId}>
      {g.valid ? (
        <svg viewBox={`0 0 ${g.viewW} ${g.viewH}`} className="w-full max-w-sm h-auto block mx-auto" role="img" aria-label={`Sketsa denah atas persegi panjang ${m(g.length)} kali ${m(g.width)}. Skala otomatis menyesuaikan, bukan skala cetak.`}>
          <rect x={g.x} y={g.y} width={g.w} height={g.h} fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
          <line x1={g.x} x2={g.x + g.w} y1={g.y - 12} y2={g.y - 12} stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
          <line x1={g.x} x2={g.x} y1={g.y - 16} y2={g.y - 8} stroke="hsl(var(--muted-foreground))" />
          <line x1={g.x + g.w} x2={g.x + g.w} y1={g.y - 16} y2={g.y - 8} stroke="hsl(var(--muted-foreground))" />
          <text x={g.x + g.w / 2} y={g.y - 18} textAnchor="middle" fontSize="12" fontFamily="JetBrains Mono, monospace" fill="hsl(var(--foreground))">P {m(g.length)}</text>
          <line x1={g.x + g.w + 12} x2={g.x + g.w + 12} y1={g.y} y2={g.y + g.h} stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
          <line x1={g.x + g.w + 8} x2={g.x + g.w + 16} y1={g.y} y2={g.y} stroke="hsl(var(--muted-foreground))" />
          <line x1={g.x + g.w + 8} x2={g.x + g.w + 16} y1={g.y + g.h} y2={g.y + g.h} stroke="hsl(var(--muted-foreground))" />
          <text transform={`translate(${g.x + g.w + 28} ${g.y + g.h / 2}) rotate(90)`} textAnchor="middle" fontSize="12" fontFamily="JetBrains Mono, monospace" fill="hsl(var(--foreground))">L {m(g.width)}</text>
        </svg>
      ) : (
        <div className="text-xs text-muted-foreground p-3 text-center border border-dashed border-border" role="status">Sketsa belum tersedia. {g.reason}</div>
      )}
      <figcaption className="text-xs mt-2 space-y-0.5">
        {name?.trim() && <div className="font-medium break-words">{name}</div>}
        <div className="font-mono text-muted-foreground break-words">
          {fl != null && Number.isInteger(fl) && fl > 0 ? `Lantai ${fl}` : 'Lantai belum valid'}
          {g.valid && ` / Luas geometris ${numberLabel(g.length * g.width)} m²`}
        </div>
        {g.valid && <div className="font-mono text-muted-foreground break-words">Panjang {m(g.length)} × lebar {m(g.width)}</div>}
        {g.valid && Math.min(g.w, g.h) < 1 && <div className="text-muted-foreground">Sisi sangat tipis pada skala layar; proporsi asli tetap dipertahankan. Baca ukuran pada label.</div>}
        <div className="text-muted-foreground">Sketsa persegi panjang otomatis, skala menyesuaikan layar (bukan skala cetak). Hanya ilustrasi ukuran isian; tidak menunjukkan letak antarruang, status eksisting/usulan, atau kecukupan struktur.</div>
      </figcaption>
    </figure>
  );
}
