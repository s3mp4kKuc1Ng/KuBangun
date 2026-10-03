import type { SVGProps } from 'react';
import { areaMeterLabel as m, type AreaGeometry } from '../lib/area-preview';

/** Same proportional drawing for the live preview and the standalone export. */
export function AreaSketch({ geometry: g, standalone = false, ...props }: SVGProps<SVGSVGElement> & { geometry: Extract<AreaGeometry, { valid: true }>; standalone?: boolean }) {
  const ink = standalone ? '#17202a' : 'hsl(var(--foreground))';
  const muted = standalone ? '#56616e' : 'hsl(var(--muted-foreground))';
  return (
    <svg viewBox={`0 0 ${g.viewW} ${g.viewH}`} role="img" aria-label={`Sketsa denah atas persegi panjang ${m(g.length)} kali ${m(g.width)}. Skala otomatis menyesuaikan, bukan skala cetak.`} {...props}>
      <rect x={g.x} y={g.y} width={g.w} height={g.h} fill={standalone ? '#eef1f4' : 'hsl(var(--muted))'} stroke={ink} strokeWidth="1.5" />
      <line x1={g.x} x2={g.x + g.w} y1={g.y - 12} y2={g.y - 12} stroke={muted} />
      <line x1={g.x} x2={g.x} y1={g.y - 16} y2={g.y - 8} stroke={muted} />
      <line x1={g.x + g.w} x2={g.x + g.w} y1={g.y - 16} y2={g.y - 8} stroke={muted} />
      <text x={g.x + g.w / 2} y={g.y - 18} textAnchor="middle" fontSize="12" fontFamily="monospace" fill={ink}>P {m(g.length)}</text>
      <line x1={g.x + g.w + 12} x2={g.x + g.w + 12} y1={g.y} y2={g.y + g.h} stroke={muted} />
      <line x1={g.x + g.w + 8} x2={g.x + g.w + 16} y1={g.y} y2={g.y} stroke={muted} />
      <line x1={g.x + g.w + 8} x2={g.x + g.w + 16} y1={g.y + g.h} y2={g.y + g.h} stroke={muted} />
      <text transform={`translate(${g.x + g.w + 28} ${g.y + g.h / 2}) rotate(90)`} textAnchor="middle" fontSize="12" fontFamily="monospace" fill={ink}>L {m(g.width)}</text>
    </svg>
  );
}