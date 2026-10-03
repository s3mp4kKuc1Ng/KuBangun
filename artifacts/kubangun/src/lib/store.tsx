import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Project, Settings } from './types';
import { seedProjects } from './seed';
import { delBlob } from './idb';

const PK = 'kubangun.projects.v1';
const SK = 'kubangun.settings.v1';
interface Ctx {
  projects: Project[]; settings: Settings; saveError: string | null; loadError: string | null;
  clearError: () => void; retrySave: () => void;
  addProject: (p: Project) => boolean;
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
    catch (e) { setSaveError('Gagal menyimpan ke localStorage: ' + (e as Error).message + '. Perubahan hanya ada di memori dan hilang saat halaman dimuat ulang.'); return false; }
  }, []);
  useEffect(() => { if (!init.current.err && localStorage.getItem(PK) === null) persist(projects); }, []); // eslint-disable-line

  const commit = (list: Project[]) => { ref.current = list; setProjects(list); return persist(list); };

  const value = useMemo<Ctx>(() => ({
    projects, settings, saveError, loadError,
    clearError: () => { setSaveError(null); setLoadError(null); },
    retrySave: () => { persist(ref.current); },
    addProject: (p) => commit([p, ...ref.current]),
    updateProject: (id, fn, bump = true) => commit(ref.current.map((p) => {
      if (p.id !== id) return p;
      const n = fn(p);
      const t = new Date().toISOString();
      return bump ? { ...n, revision: p.revision + 1, updatedAt: t, status: 'draft', reviewRequestedAt: undefined, reviewRequestedRevision: undefined } : { ...n, updatedAt: t };
    })),
    deleteProject: async (id) => {
      const p = ref.current.find((x) => x.id === id);
      let err: string | null = null;
      if (p) for (const d of p.documents) { try { await delBlob(d.id); } catch (e) { err = 'Sebagian berkas lokal gagal dihapus dari IndexedDB: ' + (e as Error).message; } }
      commit(ref.current.filter((x) => x.id !== id));
      return err;
    },
    setSettings: (s) => { setSettingsState(s); try { localStorage.setItem(SK, JSON.stringify(s)); return true; } catch (e) { setSaveError('Gagal menyimpan pengaturan: ' + (e as Error).message); return false; } },
    resetSeeds: () => { commit([...ref.current.filter((p) => !p.example), ...seedProjects().filter((s) => !ref.current.some((p) => p.id === s.id))]); },
  }), [projects, settings, saveError, loadError, persist]); // eslint-disable-line
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useStore = () => { const c = useContext(C); if (!c) throw new Error('StoreProvider hilang'); return c; };
export const useProject = (id: string) => useStore().projects.find((p) => p.id === id);
