import { useEffect, useRef, useState } from 'react';
import { Download, Eye, FileText, ImageIcon, Trash2, Upload, ScanText, AlertTriangle } from 'lucide-react';
import { Badge, Btn, Confirm, Empty, Modal, inputCls } from '@/components/kit';
import { ACCEPT, MAX_FILE, fmtDateTime, fmtSize, uid } from '@/lib/format';
import { delBlob, getBlob, putBlob } from '@/lib/idb';
import type { DocMeta } from '@/lib/types';
import type { WP } from './common';
import { useStore } from '@/lib/store';

function Preview({ d, onClose }: { d: DocMeta; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let u: string | null = null; let live = true;
    getBlob(d.id).then((b) => { if (!live) return; if (!b) return setErr('Isi berkas tidak ditemukan di IndexedDB. Metadata ada, tetapi byte-nya hilang (data situs mungkin dibersihkan).'); u = URL.createObjectURL(b); setUrl(u); }).catch((e) => live && setErr('Gagal membaca IndexedDB: ' + e.message));
    return () => { live = false; if (u) URL.revokeObjectURL(u); };
  }, [d.id]);
  return <Modal wide title={d.name} onClose={onClose}>
    {err ? <p className="text-sm text-destructive" role="alert" data-testid="text-preview-error">{err}</p> : !url ? <div className="skel h-64" /> : d.mime === 'application/pdf' ? <iframe title={d.name} src={url} className="w-full h-[60vh] border border-border" data-testid="preview-pdf" /> : <img src={url} alt={d.name} className="max-h-[60vh] mx-auto" data-testid="preview-image" />}
  </Modal>;
}

export function Documents({ p, up }: WP) {
  const { markDocumentAvailable } = useStore();
  const ref = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const [restore, setRestore] = useState<DocMeta | null>(null);
  const [err, setErr] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<DocMeta['sourceState']>(p.mode === 'new' ? 'proposed' : 'existing');
  const [prev, setPrev] = useState<DocMeta | null>(null);
  const [del, setDel] = useState<DocMeta | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); const errs: string[] = [];
    for (const f of Array.from(files)) {
      if (!ACCEPT.includes(f.type)) { errs.push(`${f.name}: tipe ${f.type || 'tidak dikenal'} ditolak. Hanya PDF, JPG, PNG.`); continue; }
      if (f.size > MAX_FILE) { errs.push(`${f.name}: ${fmtSize(f.size)} melebihi batas ${fmtSize(MAX_FILE)}.`); continue; }
      if (f.size === 0) { errs.push(`${f.name}: berkas kosong.`); continue; }
      const id = uid();
      try { await putBlob(id, f); } catch (e) { errs.push(`${f.name}: gagal menyimpan ke IndexedDB. ${(e as Error).message}`); continue; }
      const meta: DocMeta = { id, name: f.name, mime: f.type, size: f.size, sourceState: state, uploadedAt: new Date().toISOString() };
      if (!await up((x) => ({ ...x, documents: [...x.documents, meta] }))) {
        await delBlob(id);
        errs.push(`${f.name}: metadata gagal disimpan. Periksa peringatan penyimpanan.`);
      }
    }
    setErr(errs); setBusy(false); if (ref.current) ref.current.value = '';
  };
  const download = async (d: DocMeta) => {
    try { const b = await getBlob(d.id); if (!b) throw new Error('Isi berkas tidak ditemukan di IndexedDB.'); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = d.name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
    catch (e) { setErr([`Unduh ${d.name} gagal: ${(e as Error).message}`]); }
  };
  const supply = async (f?: File) => {
    if (!f || !restore) return;
    setBusy(true); setErr([]);
    try {
      if (!ACCEPT.includes(f.type) || f.size === 0 || f.size > MAX_FILE)
        throw new Error('Pasok PDF, JPG, atau PNG tidak kosong dalam batas ukuran.');
      if (f.name !== restore.name || f.type !== restore.mime || f.size !== restore.size)
        throw new Error('Nama, tipe, dan ukuran harus sama dengan metadata cadangan. Pilih berkas asli; isi tidak dapat diverifikasi otomatis.');
      await putBlob(restore.id, f);
      try { await markDocumentAvailable(p.id, restore.id); }
      catch (e) { await delBlob(restore.id); throw e; }
      setRestore(null);
    } catch (e) { setErr([`Pemulihan berkas gagal: ${(e as Error).message}`]); }
    finally { setBusy(false); if (restoreRef.current) restoreRef.current.value = ''; }
  };
  const remove = async (d: DocMeta) => {
    if (!await up((x) => ({ ...x, documents: x.documents.filter((y) => y.id !== d.id), rooms: x.rooms.map((r) => (r.documentId === d.id ? { ...r, documentId: undefined, source: 'tidak-diketahui' as const } : r)), components: x.components.map((c) => (c.documentId === d.id ? { ...c, documentId: undefined, source: 'tidak-diketahui' as const } : c)), observations: x.observations.map((o) => (o.photoDocumentId === d.id ? { ...o, photoDocumentId: undefined } : o)) }))) {
      setErr(['Dokumen tidak dihapus karena penyimpanan gagal. Berkas bukti tetap dipertahankan.']); return;
    }
    try { await delBlob(d.id); } catch (e) { setErr([`Metadata dihapus, tetapi byte ${d.name} gagal dihapus dari IndexedDB: ${(e as Error).message}.`]); }
  };
  const SL = { existing: 'Eksisting', proposed: 'Usulan', unknown: 'Asal tidak diketahui' };
  return (
    <div className="space-y-5">
      <input ref={restoreRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" data-testid="input-supply-document" onChange={(e) => void supply(e.target.files?.[0])} />
      {restore && <p className="text-sm bg-muted p-3">Pasok berkas asli: <b><span data-i18n="off">{restore.name}</span></b> ({fmtSize(restore.size)}). Metadata dicocokkan; isi bukan verifikasi profesional.</p>}
      <div className="bg-card border border-card-border p-4 flex flex-wrap gap-4 items-end">
        <div><div className="text-xs font-mono uppercase text-muted-foreground mb-1">Keadaan yang digambarkan</div><select data-testid="select-doc-state" className={inputCls} value={state} onChange={(e) => setState(e.target.value as DocMeta['sourceState'])}><option value="existing">Eksisting</option><option value="proposed">Usulan</option><option value="unknown">Tidak diketahui</option></select></div>
        <input ref={ref} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => onFiles(e.target.files)} data-testid="input-file" />
        <Btn v="primary" onClick={() => ref.current?.click()} disabled={busy} data-testid="button-upload"><Upload size={15} />{busy ? 'Menyimpan...' : 'Unggah PDF / JPG / PNG'}</Btn>
        <p className="text-xs text-muted-foreground basis-full">Maks. {fmtSize(MAX_FILE)} per berkas. Berkas disimpan di IndexedDB perangkat ini, tidak diunggah ke mana pun. Gambar usulan tidak membuktikan kondisi terbangun.</p>
      </div>
      <div className="border border-dashed border-input p-3 flex gap-3 items-center text-sm bg-muted/50"><ScanText size={18} className="text-muted-foreground" /><div className="flex-1"><b>Ekstraksi ukuran otomatis: tidak tersedia.</b> Belum ada layanan ekstraksi di prototipe ini dan tidak ada angka yang ditebak. Baca ukuran dari gambar, lalu masukkan manual di tab Ruang & Komponen dengan menautkan dokumen sumbernya.</div><Btn sm disabled data-testid="button-extract">Ekstrak (nonaktif)</Btn></div>
      {err.length > 0 && <ul role="alert" className="border-l-4 border-destructive bg-[hsl(8,60%,92%)] p-3 text-sm space-y-1" data-testid="list-upload-errors">{err.map((x, i) => <li key={i} className="flex gap-2"><AlertTriangle size={15} className="shrink-0 mt-0.5 text-destructive" />{x}</li>)}</ul>}
      {p.documents.length === 0 ? <Empty title="Belum ada dokumen" body="Unggah denah, gambar kerja, foto kondisi, atau laporan. Berkas asli dipertahankan apa adanya." /> :
        <ul className="grid md:grid-cols-2 gap-3">{p.documents.map((d) => <li key={d.id} className="bg-card border border-card-border p-4 flex gap-3" data-testid={`card-doc-${d.id}`}>
          <div className="w-10 h-10 bg-muted grid place-items-center shrink-0">{d.mime === 'application/pdf' ? <FileText size={20} /> : <ImageIcon size={20} />}</div>
          <div className="min-w-0 flex-1"><div className="font-medium truncate" title={d.name} data-i18n="off">{d.name}</div><div className="text-xs text-muted-foreground font-mono">{d.mime.split('/')[1].toUpperCase()} / {fmtSize(d.size)} / {fmtDateTime(d.uploadedAt)}</div>
            <div className="mt-1 flex gap-1 flex-wrap"><Badge tone={d.sourceState === 'existing' ? 'ink' : d.sourceState === 'proposed' ? 'accent' : 'muted'}>{SL[d.sourceState]}</Badge><Badge tone="warn">Belum diverifikasi</Badge></div>
             {d.availability === 'unavailable' && <p className="text-xs text-destructive mt-2">Tidak tersedia — hanya metadata cadangan. Pasok berkas asli.</p>}
             <div className="flex gap-1 mt-2 flex-wrap"><Btn sm disabled={d.availability === 'unavailable'} onClick={() => setPrev(d)} data-testid={`button-preview-${d.id}`}><Eye size={13} />Lihat</Btn><Btn sm disabled={d.availability === 'unavailable'} onClick={() => download(d)} data-testid={`button-download-${d.id}`}><Download size={13} />Unduh</Btn>{d.availability === 'unavailable' && <Btn sm disabled={busy} onClick={() => { setRestore(d); restoreRef.current?.click(); }} data-testid={`button-supply-${d.id}`}><Upload size={13} />Pasok berkas asli</Btn>}<Btn sm v="ghost" onClick={() => setDel(d)} aria-label="Hapus" data-testid={`button-delete-doc-${d.id}`}><Trash2 size={13} /></Btn></div></div></li>)}</ul>}
      {prev && <Preview d={prev} onClose={() => setPrev(null)} />}
      {del && <Confirm title="Hapus dokumen?" label="Hapus" body={<>Berkas <b><span data-i18n="off">{del.name}</span></b> dihapus dari IndexedDB. Ukuran yang tertaut ke dokumen ini ditandai sumber tidak diketahui. Revisi naik.</>} onClose={() => setDel(null)} onOk={() => remove(del)} />}
    </div>
  );
}
