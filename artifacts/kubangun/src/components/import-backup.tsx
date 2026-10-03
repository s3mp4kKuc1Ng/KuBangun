import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Btn, Field, Modal, inputCls } from './kit';
import { useStore } from '@/lib/store';
import { MAX_BACKUP_BYTES, parseBackup, type DuplicatePolicy } from '@/lib/import';
import { roomState } from '@/lib/room-comparison';
import type { Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function ImportBackup() {
  const { projects, importProjects, loadError } = useStore();
  const { toast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<Project[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const [policy, setPolicy] = useState<DuplicatePolicy>('skip');
  const duplicates = backup?.filter((p) => projects.some((x) => x.id === p.id)).length ?? 0;
  const count = (backup?.length ?? 0) - (policy === 'skip' ? duplicates : 0);
  const choose = async (file?: File) => {
    if (!file) return;
    setError(''); setBackup(null); setReading(true); setPolicy('skip');
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Cadangan melebihi batas 10 MB.');
      const parsed = parseBackup(await file.text());
      setBackup(parsed); setFileName(file.name);
    } catch (e) { setError((e as Error).message); }
    finally { setReading(false); if (ref.current) ref.current.value = ''; }
  };
  const confirm = async () => {
    if (!backup) return;
    try {
      const result = await importProjects(backup, policy);
      setBackup(null); setError('');
      toast({ title: `${result.added} proyek dipulihkan`, description: `${result.skipped} duplikat dilewati. Isi berkas tidak termasuk cadangan.` });
    } catch (e) { setError((e as Error).message); }
  };
  return <section className="bg-card border border-card-border p-5 space-y-3">
    <h2 className="font-display text-xl font-bold">Pulihkan cadangan JSON</h2>
    <p className="text-sm text-muted-foreground">Pilih ekspor satu atau semua proyek KuBangun (maks. 10 MB). Data diperiksa dan ditampilkan sebelum disimpan. Proyek yang ada tidak ditimpa.</p>
    <input ref={ref} type="file" accept=".json,application/json" className="hidden" data-testid="input-import-backup" onChange={(e) => void choose(e.target.files?.[0])} />
    <Btn disabled={reading || !!loadError} onClick={() => ref.current?.click()} data-testid="button-import-backup"><Upload size={14} />{reading ? 'Memeriksa...' : 'Pilih cadangan JSON'}</Btn>
    {loadError && <p className="text-sm text-destructive">Impor dinonaktifkan karena data lokal gagal dibaca. Amankan data lama terlebih dahulu.</p>}
    {error && !backup && <p role="alert" className="text-sm text-destructive" data-testid="text-import-error">{error}</p>}
    {backup && <Modal wide title="Pratinjau pemulihan" onClose={() => { setBackup(null); setError(''); }}>
      <div className="space-y-4 text-sm">
        <p className="break-all">{fileName} — {backup.length} proyek, {duplicates} ID duplikat.</p>
        <ul className="max-h-60 overflow-y-auto divide-y divide-border" data-testid="list-import-preview">{backup.map((p) => <li key={p.id} className="py-2">
          <b>{p.name}</b> {projects.some((x) => x.id === p.id) && <span className="text-destructive">— duplikat</span>}
          <p>Revisi {p.revision} · {p.rooms.length} ruang · {p.rooms.filter((r) => roomState(r) === 'unknown').length} belum berlabel · {p.rooms.filter((r) => r.existingRoomId).length} pasangan · {p.documents.length} dokumen hanya metadata</p>
          <p className="text-muted-foreground">{p.mode === 'renovation' ? 'Renovasi' : 'Bangunan baru'} · {p.archived ? 'Arsip' : 'Aktif'} · {p.status === 'draft' ? 'Draf' : 'Tinjauan diminta (simulasi, tidak terkirim)'}</p>
        </li>)}</ul>
        {duplicates > 0 && <Field label="Penanganan ID proyek duplikat"><select className={inputCls} value={policy} onChange={(e) => setPolicy(e.target.value as DuplicatePolicy)} data-testid="select-import-duplicates">
          <option value="skip">Lewati — pertahankan proyek lokal</option><option value="copy">Pulihkan sebagai salinan terpisah</option>
        </select></Field>}
        <p className="text-muted-foreground">Keadaan ruang, pasangan eksplisit, sumber, konfirmasi pengguna, revisi, dan catatan tinjauan dipertahankan. Ruang lama tanpa label tetap tidak diklasifikasikan. ID dokumen (dan ID salinan) diperbarui bersama semua tautannya.</p>
        <p className="border-l-4 border-accent bg-muted p-3">Isi berkas tidak dipulihkan. Dokumen ditandai tidak tersedia sampai Anda memasok berkas asli di tab Dokumen. Laporan tetap pendahuluan, bukan persetujuan atau verifikasi profesional.</p>
        {error && <p role="alert" className="text-destructive" data-testid="text-import-error">{error}</p>}
        <div className="flex justify-end gap-2"><Btn onClick={() => { setBackup(null); setError(''); }} data-testid="button-cancel-import">Batal</Btn><Btn v="primary" disabled={!count} onClick={confirm} data-testid="button-confirm-import">Pulihkan {count} proyek</Btn></div>
      </div>
    </Modal>}
  </section>;
}