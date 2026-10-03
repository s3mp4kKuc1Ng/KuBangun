import type { Project } from './types';
export type RState = 'ok' | 'unconfirmed' | 'missing' | 'unknown';
export interface RItem { key: string; label: string; state: RState; note: string; tab: string }
const unk = (s: string) => !s.trim() || /^tidak diketahui$/i.test(s.trim());
export function readiness(p: Project): RItem[] {
  const out: RItem[] = [];
  const num = (key: string, label: string, v: number | null, note: string) => out.push({ key, label, state: v == null ? 'missing' : 'ok', note: v == null ? 'Belum diisi. ' + note : 'Diisi manual. ' + note, tab: 'profil' });
  num('land', 'Luas lahan', p.landArea, 'Perkiraan, bukan geometri terverifikasi.');
  num('foot', 'Luas telapak bangunan', p.footprintArea, 'Perkiraan.');
  num('total', 'Luas total lantai', p.totalArea, 'Perkiraan.');
  num('floors', 'Jumlah lantai', p.floors, 'Diperlukan untuk setiap modul.');
  out.push({ key: 'structure', label: 'Sistem struktur', state: unk(p.structure) ? 'unknown' : 'ok', note: unk(p.structure) ? 'Tidak diketahui atau kosong. Perlu bukti gambar atau investigasi lapangan.' : 'Deskripsi dari pengguna.', tab: 'profil' });
  out.push({ key: 'material', label: 'Material utama', state: unk(p.material) ? 'unknown' : 'ok', note: unk(p.material) ? 'Tidak diketahui. Jangan ditebak; cari dokumen atau uji lapangan.' : 'Deskripsi dari pengguna.', tab: 'profil' });
  out.push({ key: 'rooms', label: 'Ruang', state: p.rooms.length === 0 ? 'missing' : p.rooms.some((r) => !r.confirmed) ? 'unconfirmed' : 'ok', note: p.rooms.length === 0 ? 'Belum ada ruang dicatat.' : `${p.rooms.filter((r) => !r.confirmed).length} dari ${p.rooms.length} ruang belum dikonfirmasi pengguna.`, tab: 'ruang' });
  out.push({ key: 'components', label: 'Komponen struktur/arsitektur', state: p.components.length === 0 ? 'missing' : p.components.some((c) => !c.confirmed) ? 'unconfirmed' : 'ok', note: p.components.length === 0 ? 'Belum ada komponen dicatat.' : `${p.components.filter((c) => !c.confirmed).length} dari ${p.components.length} komponen belum dikonfirmasi pengguna.`, tab: 'ruang' });
  const unkMat = p.components.filter((c) => unk(c.material)).length;
  if (p.components.length) out.push({ key: 'compmat', label: 'Material komponen', state: unkMat ? 'unknown' : 'ok', note: unkMat ? `${unkMat} komponen bermaterial tidak diketahui.` : 'Semua komponen memiliki deskripsi material.', tab: 'ruang' });
  out.push({ key: 'docs', label: 'Gambar / dokumen', state: p.documents.length === 0 ? 'missing' : 'ok', note: p.documents.length === 0 ? 'Belum ada berkas diunggah. Gambar rencana tidak membuktikan kondisi terbangun.' : `${p.documents.length} berkas tersimpan lokal. Ekstraksi otomatis dinonaktifkan.`, tab: 'dokumen' });
  if (p.mode === 'renovation') {
    out.push({ key: 'obs', label: 'Observasi kondisi eksisting', state: p.observations.length === 0 ? 'missing' : 'ok', note: p.observations.length === 0 ? 'Belum ada observasi dicatat.' : `${p.observations.length} observasi tercatat; tanpa penafsiran penyebab.`, tab: 'observasi' });
    out.push({ key: 'chg', label: 'Rencana perubahan', state: p.changes.length === 0 ? 'missing' : 'ok', note: p.changes.length === 0 ? 'Belum ada perubahan diusulkan.' : `${p.changes.length} perubahan diusulkan. Peran struktural elemen perlu evaluasi profesional.`, tab: 'perubahan' });
  }
  return out;
}
export const RLABEL: Record<RState, string> = { ok: 'Terisi', unconfirmed: 'Belum dikonfirmasi', missing: 'Belum ada', unknown: 'Tidak diketahui' };
export const gaps = (p: Project) => readiness(p).filter((r) => r.state !== 'ok');
export const readinessPct = (p: Project) => { const r = readiness(p); return Math.round((r.filter((x) => x.state === 'ok').length / r.length) * 100); };
