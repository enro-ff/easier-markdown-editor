import type { StoredImageMeta } from "../utils/imageStore";
import type { StoredFolderMeta } from "../utils/folderStore";

// 数据库配置
const DB_NAME = "fileHandles";
const DB_VERSION = 3;

// 存储表名常量
export const STORE_HANDLES = "handles";
export const STORE_IMAGE_META = "imageMeta";
export const STORE_IMAGE_CHUNKS = "imageChunks";
export const STORE_FOLDERS = "folders";

/**
 * 获取 IndexedDB 工厂对象，兼容不同浏览器
 * @returns IndexedDB 工厂对象
 */
const getIndexedDB = (): IDBFactory => {
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

/**
 * 确保所有必要的存储表和索引已创建
 * @param db - 数据库连接
 */
const ensureStores = (db: IDBDatabase) => {
  // 文件句柄存储
  if (!db.objectStoreNames.contains(STORE_HANDLES)) {
    db.createObjectStore(STORE_HANDLES, { keyPath: "id" });
  }

  // 图片元数据存储
  if (!db.objectStoreNames.contains(STORE_IMAGE_META)) {
    const store = db.createObjectStore(STORE_IMAGE_META, { keyPath: "id" });
    store.createIndex("url", "url", { unique: true });
    store.createIndex("parentId", "parentId", { unique: false });
    store.createIndex("id", "id", { unique: true });
    store.createIndex("hash", "hash", { unique: false });
    
    // 初始化根文件夹
    store.add({
      id: 1,
      name: "root",
      type: "folder",
      parentId: 0,
      url: "./",
    } as StoredFolderMeta);
    
    // 初始化上级文件夹
    store.add({
      id: 2,
      name: "other",
      type: "folder",
      parentId: 0,
      url: "../",
    } as StoredFolderMeta);
  }

  // 图片分片存储
  if (!db.objectStoreNames.contains(STORE_IMAGE_CHUNKS)) {
    const chunkStore = db.createObjectStore(STORE_IMAGE_CHUNKS, { keyPath: "id" });
    chunkStore.createIndex("imageId", "imageId", { unique: false });
    chunkStore.createIndex("index", "index", { unique: false });
  }

  // 文件夹存储（如果需要单独的文件夹表）
  if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
    console.log("创建文件夹存储")
    
    const folderStore = db.createObjectStore(STORE_FOLDERS, { keyPath: "id" });
    folderStore.createIndex("url", "url", { unique: true });
    folderStore.createIndex("parentId", "parentId", { unique: false });

    // 初始化根文件夹
    folderStore.add({
      id: 1,
      name: "root",
      type: "folder",
      parentId: 0,
      url: "./",
    } as StoredFolderMeta);
    
    // 初始化上级文件夹
    folderStore.add({
      id: 2,
      name: "other",
      type: "folder",
      parentId: 0,
      url: "../",
    } as StoredFolderMeta);
  }
};

/**
 * 打开 IndexedDB 连接的 Hook
 * @returns 数据库连接的 Promise
 */
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
        reject(request.error ?? new Error("Failed to open IndexedDB"));
      };
      
      request.onblocked = () => {
        console.warn("IndexedDB upgrade is blocked by another tab");
      };
    } catch (error) {
      reject(error);
    }
  });

export default useIndexedDB;
