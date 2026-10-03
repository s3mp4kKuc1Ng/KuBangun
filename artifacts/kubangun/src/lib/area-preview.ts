export const PREVIEW_VIEW = { w: 360, h: 240, left: 16, top: 34, right: 48, bottom: 18 };

export type AreaGeometry =
  | { valid: false; reason: string }
  | { valid: true; length: number; width: number; viewW: number; viewH: number; x: number; y: number; w: number; h: number; mPerUnit: number };

/** Fits an exact-ratio rectangle (length horizontal, width vertical) into the view box. */
export function areaPreviewGeometry(length: unknown, width: unknown): AreaGeometry {
  if (typeof length !== 'number' || typeof width !== 'number' || length === undefined) return { valid: false, reason: 'Panjang dan lebar belum diisi.' };
  if (!Number.isFinite(length) || !Number.isFinite(width)) return { valid: false, reason: 'Panjang atau lebar bukan angka yang valid.' };
  if (length <= 0 || width <= 0) return { valid: false, reason: 'Panjang dan lebar harus lebih dari 0.' };
  const area = length * width;
  if (!Number.isFinite(area) || area === 0) return { valid: false, reason: 'Ukuran melampaui ketelitian angka yang didukung. Periksa kembali satuan dan ukurannya.' };
  const v = PREVIEW_VIEW;
  const aw = v.w - v.left - v.right, ah = v.h - v.top - v.bottom;
  const max = Math.max(length, width);
  const normalizedLength = length / max, normalizedWidth = width / max;
  const s = Math.min(aw / normalizedLength, ah / normalizedWidth);
  const w = normalizedLength * s, h = normalizedWidth * s;
  if (w === 0 || h === 0) return { valid: false, reason: 'Perbandingan ukuran melampaui ketelitian gambar. Periksa kembali satuan dan ukurannya.' };
  return { valid: true, length, width, viewW: v.w, viewH: v.h, x: v.left + (aw - w) / 2, y: v.top + (ah - h) / 2, w, h, mPerUnit: max / s };
}
