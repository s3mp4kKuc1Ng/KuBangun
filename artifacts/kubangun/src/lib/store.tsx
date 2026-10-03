import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Project, Settings } from './types';
import { seedProjects } from './seed';
import { delBlob } from './idb';
import { prepareImport, type DuplicatePolicy } from './import';

const PK = 'kubangun.projects.v1';
const SK = 'kubangun.settings.v1';
interface Ctx {
  projects: Project[]; settings: Settings; saveError: string | null; loadError: string | null;
  clearError: () => void; retrySave: () => void;
  addProject: (p: Project) => boolean;
  importProjects: (projects: Project[], policy: DuplicatePolicy) => { added: number; skipped: number };
  markDocumentAvailable: (projectId: string, documentId: string) => void;
  updateProject: (id: string, fn: (p: Project) => Project, bump?: boolean) => boolean;
  deleteProject: (id: string) => Promise<string | null>;
  setSettings: (s: Settings) => boolean;
  resetSeeds: () => void;
}
const C = createContext<Ctx | null>(null);

function load(): { projects: Project[]; settings: Settings; err: string | null } {
  const dflt: Settings = { name: '', organization: '', role: 'pemilik' };
  try {
    const raw = localStorage.getItem(PK);
    const s = localStorage.getItem(SK);
    const settings = s ? { ...dflt, ...JSON.parse(s) } : dflt;
    if (raw === null) return { projects: seedProjects(), settings, err: null };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Format data tidak dikenali');
    if (!parsed.every((p) => p && Array.isArray(p.rooms) && p.rooms.every((r: unknown) => r && typeof r === 'object')))
      throw new Error('Format ruang tidak dikenali');
    // Missing legacy states are interpreted as unknown by readers, not written
    // onto records merely because another project is saved or imported.
    return { projects: parsed, settings, err: null };
  } catch (e) {
    return { projects: seedProjects(), settings: dflt, err: 'Data lokal tidak dapat dibaca (' + (e as Error).message + '). Contoh proyek dimuat; data lama tidak ditimpa sampai Anda menyimpan perubahan.' };
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const init = useRef(load());
  const [projects, setProjects] = useState<Project[]>(init.current.projects);
  const [settings, setSettingsState] = useState<Settings>(init.current.settings);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(init.current.err);
  const ref = useRef(projects); ref.current = projects;

  const persist = useCallback((list: Project[]) => {
    try { localStorage.setItem(PK, JSON.stringify(list)); setSaveError(null); return true; }
    catch (e) { setSaveError('Gagal menyimpan ke localStorage: ' + (e as Error).message + '. Perubahan tidak disimpan; data dan notifikasi sebelumnya tetap dipertahankan. Periksa ruang penyimpanan dan coba lagi.'); return false; }
  }, []);
  useEffect(() => { if (!init.current.err && localStorage.getItem(PK) === null) persist(projects); }, []); // eslint-disable-line

  const commit = (list: Project[]) => {
    if (!persist(list)) return false;
    ref.current = list; setProjects(list); return true;
  };
  const commitRestore = (list: Project[]) => {
    try { localStorage.setItem(PK, JSON.stringify(list)); }
    catch { throw new Error('Pemulihan gagal disimpan ke perangkat. Tidak ada proyek diubah; periksa ruang penyimpanan dan coba lagi.'); }
    ref.current = list; setProjects(list); setSaveError(null);
  };

  const value = useMemo<Ctx>(() => ({
    projects, settings, saveError, loadError,
    clearError: () => { setSaveError(null); setLoadError(null); },
    retrySave: () => { persist(ref.current); },
    addProject: (p) => commit([p, ...ref.current]),
    importProjects: (incoming, policy) => {
      if (init.current.err) throw new Error('Data lokal gagal dibaca. Pulihkan atau amankan data lokal lama sebelum mengimpor.');
      const result = prepareImport(ref.current, incoming, policy);
      // Atomic restore: failed storage writes must not change the visible state.
      commitRestore(result.projects);
      return { added: result.added, skipped: result.skipped };
    },
    markDocumentAvailable: (projectId, documentId) => {
      if (!ref.current.some((p) => p.id === projectId && p.documents.some((d) => d.id === documentId && d.availability === 'unavailable')))
        throw new Error('Metadata dokumen tidak tersedia untuk dipulihkan.');
      commitRestore(ref.current.map((p) => p.id !== projectId ? p : {
        ...p, documents: p.documents.map((d) => d.id === documentId ? { ...d, availability: 'available' } : d),
        revision: p.revision + 1, updatedAt: new Date().toISOString(), status: 'draft',
        reviewRequestedAt: undefined, reviewRequestedRevision: undefined,
      }));
    },
    updateProject: (id, fn, bump = true) => {
      let changed = false;
      const list = ref.current.map((p) => {
        if (p.id !== id) return p;
        const n = fn(p);
        if (JSON.stringify(n) === JSON.stringify(p)) return p;
        changed = true;
        const t = new Date().toISOString();
        return bump ? { ...n, revision: p.revision + 1, updatedAt: t, status: 'draft' as const, reviewRequestedAt: undefined, reviewRequestedRevision: undefined } : { ...n, updatedAt: t };
      });
      return changed ? commit(list) : true;
    },
    deleteProject: async (id) => {
      const p = ref.current.find((x) => x.id === id);
      if (!commit(ref.current.filter((x) => x.id !== id))) return 'Proyek tidak dihapus karena penyimpanan gagal. Berkas bukti tetap dipertahankan.';
      let err: string | null = null;
      if (p) for (const d of p.documents) { try { await delBlob(d.id); } catch (e) { err = 'Sebagian berkas lokal gagal dihapus dari IndexedDB: ' + (e as Error).message; } }
      return err;
    },
    setSettings: (s) => { setSettingsState(s); try { localStorage.setItem(SK, JSON.stringify(s)); return true; } catch (e) { setSaveError('Gagal menyimpan pengaturan: ' + (e as Error).message); return false; } },
    resetSeeds: () => { commit([...ref.current.filter((p) => !p.example), ...seedProjects().filter((s) => !ref.current.some((p) => p.id === s.id))]); },
  }), [projects, settings, saveError, loadError, persist]); // eslint-disable-line
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useStore = () => { const c = useContext(C); if (!c) throw new Error('StoreProvider hilang'); return c; };
export const useProject = (id: string) => useStore().projects.find((p) => p.id === id);
