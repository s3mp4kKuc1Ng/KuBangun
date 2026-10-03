import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Building2, Hammer } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Btn, Field, PageHead, inputCls } from '@/components/kit';
import { PROVINCES, cx, uid, numOrNull } from '@/lib/format';
import type { Mode, Project } from '@/lib/types';

export default function NewProject() {
  const [, nav] = useLocation();
  const { addProject } = useStore();
  const [mode, setMode] = useState<Mode>('new');
  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [floors, setFloors] = useState('');
  const [desc, setDesc] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const submit = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nama proyek wajib diisi.';
    if (!province) e.province = 'Pilih provinsi.';
    if (!city.trim()) e.city = 'Kota/kabupaten wajib diisi.';
    const f = numOrNull(floors);
    if (f != null && (f < 1 || !Number.isInteger(f))) e.floors = 'Jumlah lantai harus bilangan bulat positif.';
    setErr(e);
    if (Object.keys(e).length) return;
    const t = new Date().toISOString();
    const p: Project = { id: uid(), name: name.trim(), mode, province, city: city.trim(), floors: f, landArea: null, footprintArea: null, totalArea: null, structure: '', material: '', description: desc.trim(), revision: 1, createdAt: t, updatedAt: t, status: 'draft', archived: false, rooms: [], components: [], documents: [], observations: [], changes: [], reviewNotes: [] };
    if (!await addProject(p)) return;
    nav(`/projects/${p.id}`);
  };
  const opts = [
    { m: 'new' as Mode, icon: Building2, t: 'Bangun Baru', d: 'Rumah belum berdiri. Kumpulkan data lahan, rencana ruang, dan gambar rencana.' },
    { m: 'renovation' as Mode, icon: Hammer, t: 'Renovasi', d: 'Rumah sudah ada. Catat kondisi eksisting, observasi, dan perubahan yang diusulkan, terpisah dari data eksisting.' },
  ];
  return (
    <div className="max-w-2xl">
      <PageHead kicker="Proyek baru" title="Buat Proyek" />
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {opts.map((o) => (
          <button key={o.m} type="button" data-testid={`button-mode-${o.m}`} onClick={() => setMode(o.m)} className={cx('text-left p-4 border-2 transition-all bg-card', mode === o.m ? 'border-accent -translate-y-0.5 shadow-md' : 'border-border hover:border-input')}>
            <o.icon className={mode === o.m ? 'text-accent' : 'text-muted-foreground'} /><div className="font-display font-bold text-xl mt-2">{o.t}</div><p className="text-sm text-muted-foreground mt-1">{o.d}</p>
          </button>
        ))}
      </div>
      <div className="bg-card border border-card-border p-5 space-y-4">
        <Field label="Nama proyek"><input data-testid="input-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Rumah Keluarga di Jalan Melati" />{err.name && <p className="text-xs text-destructive mt-1">{err.name}</p>}</Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Provinsi"><select data-testid="select-province" className={inputCls} value={province} onChange={(e) => setProvince(e.target.value)}><option value="">Pilih provinsi</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select>{err.province && <p className="text-xs text-destructive mt-1">{err.province}</p>}</Field>
          <Field label="Kota / Kabupaten"><input data-testid="input-city" className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />{err.city && <p className="text-xs text-destructive mt-1">{err.city}</p>}</Field>
        </div>
        <Field label={mode === 'new' ? 'Jumlah lantai rencana (opsional)' : 'Jumlah lantai eksisting (opsional)'}><input data-testid="input-floors" inputMode="numeric" className={cx(inputCls, 'max-w-[140px]')} value={floors} onChange={(e) => setFloors(e.target.value)} />{err.floors && <p className="text-xs text-destructive mt-1">{err.floors}</p>}</Field>
        <Field label="Deskripsi (opsional)"><textarea data-testid="input-description" rows={3} className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <p className="text-xs text-muted-foreground">Peruntukan: hunian rendah. Lokasi detail tidak diminta; data hanya disimpan di peramban ini.</p>
        <div className="flex gap-2 justify-end"><Link href="/projects" className="px-4 py-2 text-sm border border-input rounded-sm bg-card" data-testid="link-cancel">Batal</Link><Btn v="accent" onClick={submit} data-testid="button-create">Simpan dan buka</Btn></div>
      </div>
    </div>
  );
}
