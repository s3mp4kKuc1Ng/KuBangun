import { useState } from 'react';
import { Btn, Field, inputCls } from '@/components/kit';
import { numOrNull, PROVINCES } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import type { WP } from './common';

export function Profile({ p, up }: WP) {
  const { toast } = useToast();
  const s = (n: number | null) => (n == null ? '' : String(n));
  const [f, setF] = useState({ name: p.name, province: p.province, city: p.city, floors: s(p.floors), land: s(p.landArea), foot: s(p.footprintArea), total: s(p.totalArea), structure: p.structure, material: p.material, description: p.description });
  const [err, setErr] = useState<string[]>([]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = async () => {
    const e: string[] = [];
    const chk = (v: string, l: string, int = false) => { const n = numOrNull(v); if (v.trim() && (n == null || n <= 0 || (int && !Number.isInteger(n)))) e.push(`${l} harus angka positif${int ? ' bulat' : ''}.`); return n; };
    const floors = chk(f.floors, 'Jumlah lantai', true), land = chk(f.land, 'Luas lahan'), foot = chk(f.foot, 'Luas telapak'), total = chk(f.total, 'Luas total');
    if (!f.name.trim()) e.push('Nama proyek wajib diisi.');
    if (foot != null && land != null && foot > land) e.push('Peringatan data: luas telapak melebihi luas lahan. Periksa kembali; tetap dapat disimpan jika memang demikian.');
    if (total != null && foot != null && floors != null && total > foot * floors * 1.01) e.push('Peringatan data: luas total melebihi telapak x jumlah lantai.');
    setErr(e);
    if (e.some((x) => !x.startsWith('Peringatan'))) return;
    if (!await up((x) => ({ ...x, name: f.name.trim(), province: f.province, city: f.city.trim(), floors, landArea: land, footprintArea: foot, totalArea: total, structure: f.structure.trim(), material: f.material.trim(), description: f.description.trim() }))) return;
    toast({ title: 'Profil disimpan', description: 'Revisi dinaikkan; permintaan tinjauan (simulasi) direset.' });
  };
  return (
    <div className="space-y-5 max-w-3xl">
      <p className="text-sm text-muted-foreground">Kosongkan atau tulis <i>Tidak diketahui</i> bila belum tahu. Nilai kosong tidak pernah diisi tebakan. Semua luas adalah perkiraan yang Anda masukkan, bukan geometri terverifikasi.</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nama proyek" className="sm:col-span-2"><input data-testid="input-profile-name" className={inputCls} value={f.name} onChange={set('name')} /></Field>
        <Field label="Provinsi"><select className={inputCls} value={f.province} onChange={set('province')}>{PROVINCES.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Kota / Kabupaten"><input className={inputCls} value={f.city} onChange={set('city')} /></Field>
        <Field label="Jumlah lantai"><input data-testid="input-floors" className={inputCls} inputMode="numeric" value={f.floors} onChange={set('floors')} /></Field>
        <Field label="Luas lahan (m2)"><input data-testid="input-land" className={inputCls} inputMode="decimal" value={f.land} onChange={set('land')} /></Field>
        <Field label="Luas telapak bangunan (m2)"><input data-testid="input-footprint" className={inputCls} inputMode="decimal" value={f.foot} onChange={set('foot')} /></Field>
        <Field label="Luas total lantai (m2)"><input data-testid="input-total" className={inputCls} inputMode="decimal" value={f.total} onChange={set('total')} /></Field>
        <Field label="Sistem struktur" hint="Contoh: rangka beton bertulang, pasangan bata, kayu. Boleh 'Tidak diketahui'."><input data-testid="input-structure" className={inputCls} value={f.structure} onChange={set('structure')} /></Field>
        <Field label="Material utama" hint="Deskripsi bebas. Jangan menebak mutu material."><input data-testid="input-material" className={inputCls} value={f.material} onChange={set('material')} /></Field>
        <Field label="Deskripsi" className="sm:col-span-2"><textarea rows={3} className={inputCls} value={f.description} onChange={set('description')} /></Field>
      </div>
      {err.length > 0 && <ul className="border-l-4 border-accent bg-[hsl(45,85%,90%)] p-3 text-sm space-y-1" data-testid="list-profile-errors">{err.map((x) => <li key={x}>{x}</li>)}</ul>}
      <Btn v="primary" onClick={save} data-testid="button-save-profile">Simpan profil</Btn>
    </div>
  );
}
