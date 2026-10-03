import { useState } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Btn, Confirm, Field, PageHead, inputCls } from '@/components/kit';
import { downloadText, projectJson, projectsJson } from '@/lib/export';
import { cx } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import type { Role } from '@/lib/types';
import { ImportBackup } from '@/components/import-backup';

export default function SettingsPage() {
  const { settings, setSettings, projects, resetSeeds } = useStore();
  const { toast } = useToast();
  const [f, setF] = useState(settings);
  const [rs, setRs] = useState(false);
  const roles: { r: Role; t: string; d: string }[] = [{ r: 'pemilik', t: 'Pemilik rumah', d: 'Tampilan dengan panduan sederhana.' }, { r: 'profesional', t: 'Profesional', d: 'Tampilan ringkas dengan istilah teknis.' }];
  return <div className="max-w-2xl space-y-8">
    <PageHead kicker="Pengaturan" title="Profil lokal" />
    <section className="bg-card border border-card-border p-5 space-y-4">
      <p className="text-sm text-muted-foreground">Profil ini hanya tersimpan di peramban ini. Tidak ada akun, undangan, atau berbagi dengan orang lain.</p>
      <Field label="Nama tampilan"><input data-testid="input-settings-name" className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Organisasi (opsional)"><input className={inputCls} value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} /></Field>
      <div><div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Preferensi tampilan peran</div>
        <div className="grid sm:grid-cols-2 gap-2">{roles.map((o) => <button key={o.r} type="button" data-testid={`button-role-${o.r}`} onClick={() => setF({ ...f, role: o.r })} className={cx('text-left p-3 border-2', f.role === o.r ? 'border-accent bg-accent/10' : 'border-border')}><div className="font-medium">{o.t}</div><div className="text-xs text-muted-foreground">{o.d}</div></button>)}</div>
        <p className="text-xs text-muted-foreground mt-2">Hanya preferensi tampilan. Ini bukan otorisasi dan tidak memberi wewenang meninjau; pemilihan Profesional tidak menjadikan Anda peninjau terverifikasi.</p></div>
      <Btn v="primary" data-testid="button-save-settings" onClick={() => { if (setSettings({ ...f, name: f.name.trim(), organization: f.organization.trim() })) toast({ title: 'Pengaturan disimpan' }); }}>Simpan</Btn>
    </section>
    <section className="bg-card border border-card-border p-5">
      <h2 className="font-display text-xl font-bold mb-1">Ekspor data</h2>
      <p className="text-sm text-muted-foreground mb-3">JSON berisi data proyek dan metadata berkas (bukan isi berkas).</p>
      <Btn className="mb-3" disabled={!projects.length} onClick={() => downloadText('kubangun-semua-proyek.json', JSON.stringify(projectsJson(projects), null, 2))} data-testid="button-export-all"><Download size={14} />Semua proyek</Btn>
      <ul className="divide-y divide-border">{projects.map((p) => <li key={p.id} className="py-2 flex justify-between gap-2 items-center text-sm"><span className="truncate">{p.name}</span><Btn sm onClick={() => downloadText(`${p.id}.json`, JSON.stringify(projectJson(p), null, 2))} data-testid={`button-export-${p.id}`}>Ekspor</Btn></li>)}</ul>
    </section>
    <ImportBackup />
    <section className="bg-card border border-card-border p-5">
      <h2 className="font-display text-xl font-bold mb-1">Contoh proyek</h2>
      <p className="text-sm text-muted-foreground mb-3">Pulihkan contoh fiktif yang terhapus. Proyek Anda tidak diubah.</p>
      <Btn onClick={() => setRs(true)} data-testid="button-restore-seeds"><RotateCcw size={14} />Pulihkan contoh</Btn>
    </section>
    {rs && <Confirm title="Pulihkan contoh proyek?" label="Pulihkan" body="Contoh yang hilang akan ditambahkan kembali; contoh yang ada tidak ditimpa." onClose={() => setRs(false)} onOk={() => { resetSeeds(); toast({ title: 'Contoh dipulihkan' }); }} />}
  </div>;
}
