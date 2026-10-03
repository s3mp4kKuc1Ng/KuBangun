import type { Project } from './types';
import { readStorageVersion, writeStorageVersion } from './storage-version';

export const PROJECT_KEY = 'kubangun.projects.v1';
export const PROJECT_LOCK = 'kubangun.projects.write';

export function readProjects(raw: string): Project[] {
  const parsed = JSON.parse(raw);
  // Keep legacy arrays readable; the storage envelope is not the JSON backup format.
  const projects = Array.isArray(parsed) ? parsed : parsed?.format === 'kubangun-storage-v1'
    && typeof parsed.saveVersion === 'string' ? parsed.projects : null;
  if (!Array.isArray(projects)) throw new Error('Format data tidak dikenali');
  if (!projects.every((p) => p && Array.isArray(p.rooms) && p.rooms.every((r: unknown) => r && typeof r === 'object')))
    throw new Error('Format ruang tidak dikenali');
  return projects;
}

export function encodeProjects(projects: Project[]): string {
  return JSON.stringify({ format: 'kubangun-storage-v1', saveVersion: crypto.randomUUID(), projects });
}

const versionOf = (raw: string | null): string | undefined => {
  try {
    const parsed = raw === null ? null : JSON.parse(raw);
    return parsed?.format === 'kubangun-storage-v1' && typeof parsed.saveVersion === 'string' ? parsed.saveVersion : undefined;
  } catch { return undefined; }
};

// Called inside the exclusive Web Lock. Publish the shared version first so a
// subsequent lock holder cannot accept a stale localStorage cache as current.
export async function writeProjects(expectedRaw: string | null, projects: Project[]): Promise<string> {
  const previous = await readStorageVersion();
  if ((previous !== undefined && previous !== versionOf(expectedRaw)) || localStorage.getItem(PROJECT_KEY) !== expectedRaw)
    throw new StorageConflict();
  const raw = encodeProjects(projects);
  await writeStorageVersion(versionOf(raw));
  try { localStorage.setItem(PROJECT_KEY, raw); }
  catch (e) {
    // While still holding the lock, undo only the coordination marker. The
    // previous projects and files have not been changed by the failed write.
    await writeStorageVersion(previous);
    throw e;
  }
  return raw;
}

export const CONFLICT_MESSAGE = 'Data proyek di tab lain telah berubah. Penulisan salinan lama diblokir. Ekspor draf terlebih dahulu atau muat ulang data terbaru.';
export class StorageConflict extends Error {
  constructor() { super(CONFLICT_MESSAGE); }
}

// Comparing and writing must share an exclusive lock. A storage event alone can
// arrive too late, and localStorage has no atomic compare-and-set operation.
export async function withProjectLock<T>(run: () => T): Promise<T> {
  if (!navigator.locks) throw new Error('Peramban ini tidak mendukung penguncian antartab. Penyimpanan proyek diblokir agar data tidak tertimpa. Gunakan peramban terbaru melalui HTTPS.');
  return navigator.locks.request(PROJECT_LOCK, run);
}