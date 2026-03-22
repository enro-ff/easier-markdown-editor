const DB_NAME = "fileHandles";
const DB_VERSION = 3;

const getIndexedDB = () => {
  const possible =
    window.indexedDB ||
    // Safari <17 fallback
    (window as unknown as { webkitIndexedDB?: IDBFactory }).webkitIndexedDB ||
    (window as unknown as { mozIndexedDB?: IDBFactory }).mozIndexedDB ||
    (window as unknown as { msIndexedDB?: IDBFactory }).msIndexedDB;
  if (!possible) {
    throw new Error("IndexedDB is not available in this browser");
  }
  return possible;
};

const ensureStores = (db: IDBDatabase) => {
  if (!db.objectStoreNames.contains("handles")) {
    db.createObjectStore("handles", { keyPath: "id" });
  }
  // legacy store kept for backward compatibility but no longer used
  if (!db.objectStoreNames.contains("images")) {
    db.createObjectStore("images", { keyPath: "url" });
  }
  if (!db.objectStoreNames.contains("imageMeta")) {
    const store = db.createObjectStore("imageMeta", { keyPath: "id" });
    store.createIndex("hash", "hash", { unique: true });
    store.createIndex("createdAt", "createdAt", { unique: false });
  }
  if (!db.objectStoreNames.contains("imageChunks")) {
    const chunkStore = db.createObjectStore("imageChunks", { keyPath: "id" });
    chunkStore.createIndex("imageId", "imageId", { unique: false });
  }
};

const useIndexedDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    try {
      const idb = getIndexedDB();
      const request = idb.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        ensureStores(db);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error ?? new Error("open indexedDB failed"));
      };
      request.onblocked = () => {
        console.warn("IndexedDB upgrade is blocked by another tab");
      };
    } catch (error) {
      reject(error);
    }
  });

export default useIndexedDB;
