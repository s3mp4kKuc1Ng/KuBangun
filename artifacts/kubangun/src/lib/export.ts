import type { Project } from './types';
export function downloadText(name: string, text: string, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const projectJson = (p: Project) => ({ format: 'kubangun-project-v1', exportedAt: new Date().toISOString(), note: 'Ekspor lokal. Metadata berkas disertakan; isi berkas tidak. Bukan dokumen yang diverifikasi atau disetujui profesional.', project: p });
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'proyek';
