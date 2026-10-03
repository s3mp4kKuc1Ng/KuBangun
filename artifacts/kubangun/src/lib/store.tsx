import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Project, Settings } from './types';
import { seedProjects } from './seed';
import { delBlob } from './idb';
import { prepareImport, type DuplicatePolicy } from './import';
import { CONFLICT_MESSAGE, PROJECT_KEY as PK, StorageConflict, readProjects, withProjectLock, writeProjects } from './project-storage';
import { downloadText, projectsJson } from './export';

const SK = 'kubangun.settings.v1';
interface Ctx {
  projects: Project[]; settings: Settings; saveError: string | null; loadError: string | null;
  storageConflict: boolean; exportDraft: () => void; reloadLatest: () => void;
  clearError: () => void; retrySave: () => void;
  addProject: (p: Project) => Promise<boolean>;
  importProjects: (projects: Project[], policy: DuplicatePolicy) => Promise<{ added: number; skipped: number }>;
  markDocumentAvailable: (projectId: string, documentId: string) => Promise<void>;
  updateProject: (id: string, fn: (p: Project) => Project, bump?: boolean) => Promise<boolean>;
  deleteProject: (id: string) => Promise<string | null>;
  setSettings: (s: Settings) => boolean;
  resetSeeds: () => Promise<boolean>;
}
const C = createContext<Ctx | null>(null);

function load(): { projects: Project[]; settings: Settings; err: string | null; raw: string | null } {
  const dflt: Settings = { name: '', organization: '', role: 'pemilik' };
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PK);
    const s = localStorage.getItem(SK);
    const settings = s ? { ...dflt, ...JSON.parse(s) } : dflt;
    if (raw === null) return { projects: seedProjects(), settings, err: null, raw };
    const parsed = readProjects(raw);
    // Missing legacy states are interpreted as unknown by readers, not written
    // onto records merely because another project is saved or imported.
    return { projects: parsed, settings, err: null, raw };
  } catch (e) {
    return { projects: seedProjects(), settings: dflt, raw, err: 'Data lokal tidak dapat dibaca (' + (e as Error).message + '). Contoh proyek dimuat; data lama tidak ditimpa sampai Anda menyimpan perubahan.' };
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(load);
  const init = useRef(initial);
  const [projects, setProjects] = useState<Project[]>(init.current.projects);
  const [settings, setSettingsState] = useState<Settings>(init.current.settings);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(init.current.err);
  const ref = useRef(projects);
  const savedRaw = useRef(initial.raw);
  const draft = useRef<Project[] | null>(null);
  const conflicted = useRef(false);
  const [storageConflict, setStorageConflict] = useState(false);
  const flagConflict = useCallback(() => {
    conflicted.current = true;
    setStorageConflict(true);
  }, []);
  const persist = useCallback(async (change: (list: Project[]) => Project[], force = false) => {
    let candidate: Project[] | null = null;
    let validationFailed = false;
    try {
      return await withProjectLock(async () => {
        try { candidate = change(ref.current); }
        catch (e) { validationFailed = true; throw e; }
        if (conflicted.current || localStorage.getItem(PK) !== savedRaw.current) {
          draft.current = candidate;
          flagConflict();
          throw new StorageConflict();
        }
        if (force || JSON.stringify(candidate) !== JSON.stringify(ref.current)) {
          const raw = await writeProjects(savedRaw.current, candidate);
          savedRaw.current = raw;
          ref.current = candidate;
          setProjects(candidate);
        }
        setSaveError(null);
        return true;
      });
    } catch (e) {
      if (e instanceof StorageConflict) {
        draft.current = candidate;
        flagConflict();
        return false;
      }
      // Domain validation errors still belong to the calling form.
      if (validationFailed) throw e;
      setSaveError('Gagal menyimpan ke localStorage: ' + (e as Error).message + '. Perubahan tidak disimpan; data dan notifikasi sebelumnya tetap dipertahankan. Periksa ruang penyimpanan dan coba lagi.');
      return false;
    }
  }, [flagConflict]);
  useEffect(() => {
    const check = () => {
      try { if (localStorage.getItem(PK) !== savedRaw.current) flagConflict(); }
      catch (e) { setSaveError('Gagal memeriksa penyimpanan lokal: ' + (e as Error).message); }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea === localStorage && (e.key === PK || e.key === null)) check();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', check);
    check();
    if (!init.current.err && savedRaw.current === null && !conflicted.current) void persist((list) => list, true);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', check);
    };
  }, [flagConflict, persist]);
  const commitRestore = async (change: (list: Project[]) => Project[]) => {
    if (!await persist(change)) throw new Error(conflicted.current ? CONFLICT_MESSAGE : 'Pemulihan gagal disimpan ke perangkat. Tidak ada proyek diubah; periksa ruang penyimpanan dan coba lagi.');
  };

  const value = useMemo<Ctx>(() => ({
    projects, settings, saveError, loadError, storageConflict,
    exportDraft: () => downloadText('kubangun-draf-tab.json', JSON.stringify({
      ...projectsJson(draft.current ?? ref.current),
      note: 'Draf dari tab ini, bukan data terbaru yang tersimpan. Tidak digabung otomatis. Metadata berkas saja; isi berkas tidak termasuk. Formulir yang belum dicoba disimpan tidak termasuk.',
    }, null, 2)),
    reloadLatest: () => window.location.reload(),
    clearError: () => { setSaveError(null); setLoadError(null); },
    retrySave: () => { void persist((list) => list); },
    addProject: (p) => persist((list) => [p, ...list]),
    importProjects: async (incoming, policy) => {
      if (init.current.err) throw new Error('Data lokal gagal dibaca. Pulihkan atau amankan data lokal lama sebelum mengimpor.');
      let result: ReturnType<typeof prepareImport>;
      // Atomic restore: failed storage writes must not change the visible state.
      await commitRestore((list) => { result = prepareImport(list, incoming, policy); return result.projects; });
      return { added: result!.added, skipped: result!.skipped };
    },
    markDocumentAvailable: async (projectId, documentId) => {
      if (!ref.current.some((p) => p.id === projectId && p.documents.some((d) => d.id === documentId && d.availability === 'unavailable')))
        throw new Error('Metadata dokumen tidak tersedia untuk dipulihkan.');
      await commitRestore((list) => list.map((p) => p.id !== projectId ? p : {
        ...p, documents: p.documents.map((d) => d.id === documentId ? { ...d, availability: 'available' } : d),
        revision: p.revision + 1, updatedAt: new Date().toISOString(), status: 'draft',
        reviewRequestedAt: undefined, reviewRequestedRevision: undefined,
      }));
    },
    updateProject: (id, fn, bump = true) => persist((list) => list.map((p) => {
        if (p.id !== id) return p;
        const n = fn(p);
        if (JSON.stringify(n) === JSON.stringify(p)) return p;
        const t = new Date().toISOString();
        return bump ? { ...n, revision: p.revision + 1, updatedAt: t, status: 'draft' as const, reviewRequestedAt: undefined, reviewRequestedRevision: undefined } : { ...n, updatedAt: t };
      })),
    deleteProject: async (id) => {
      const p = ref.current.find((x) => x.id === id);
      if (!await persist((list) => list.filter((x) => x.id !== id))) return 'Proyek tidak dihapus karena penyimpanan gagal. Berkas bukti tetap dipertahankan.';
      let err: string | null = null;
      if (p) for (const d of p.documents) { try { await delBlob(d.id); } catch (e) { err = 'Sebagian berkas lokal gagal dihapus dari IndexedDB: ' + (e as Error).message; } }
      return err;
    },
    setSettings: (s) => { setSettingsState(s); try { localStorage.setItem(SK, JSON.stringify(s)); return true; } catch (e) { setSaveError('Gagal menyimpan pengaturan: ' + (e as Error).message); return false; } },
    resetSeeds: () => persist((list) => [...list.filter((p) => !p.example), ...seedProjects().filter((s) => !list.some((p) => p.id === s.id))]),
  }), [projects, settings, saveError, loadError, storageConflict, persist]); // eslint-disable-line
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useStore = () => { const c = useContext(C); if (!c) throw new Error('StoreProvider hilang'); return c; };
export const useProject = (id: string) => useStore().projects.find((p) => p.id === id);
