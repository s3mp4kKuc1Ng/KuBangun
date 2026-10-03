// Metadata only: projects remain in localStorage and files keep their own DB.
// IndexedDB transactions provide an origin-wide, coherent version read even
// when a tab's localStorage cache has not yet received another tab's write.
const DB = 'kubangun-write-coordination';
const STORE = 'version';

async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(request.error?.message || 'Gagal membuka versi penyimpanan.'));
    request.onblocked = () => reject(new Error('Versi penyimpanan terblokir. Tutup tab KuBangun lain lalu coba lagi.'));
  });
}

async function operation<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = run(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    const fail = () => { db.close(); reject(new Error(tx.error?.message || 'Gagal menyimpan versi proyek.')); };
    tx.onerror = fail;
    tx.onabort = fail;
  });
}

export const readStorageVersion = () => operation<string | undefined>('readonly', (store) => store.get('projects'));
export const writeStorageVersion = (version: string | undefined) => operation('readwrite', (store) =>
  version === undefined ? store.delete('projects') : store.put(version, 'projects'));