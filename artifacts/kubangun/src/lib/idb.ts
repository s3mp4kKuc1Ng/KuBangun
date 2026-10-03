const DB = 'kubangun-files';
const ST = 'blobs';
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('IndexedDB tidak tersedia di peramban ini.'));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(ST);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(new Error(r.error?.message || 'Gagal membuka penyimpanan berkas lokal.'));
    r.onblocked = () => rej(new Error('Penyimpanan berkas lokal terblokir.'));
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(ST, mode);
    const rq = fn(t.objectStore(ST));
    t.oncomplete = () => { db.close(); res(rq.result); };
    t.onerror = () => { db.close(); rej(new Error(t.error?.message || 'Operasi penyimpanan berkas gagal.')); };
    t.onabort = () => { db.close(); rej(new Error(t.error?.message || 'Penyimpanan berkas dibatalkan (kuota penuh?).')); };
  });
}
export const putBlob = (id: string, b: Blob) => tx('readwrite', (s) => s.put(b, id));
export const getBlob = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id));
export const delBlob = (id: string) => tx('readwrite', (s) => s.delete(id));
