import { message } from "antd";

// 数据库表名常量
const DB_IMAGE_META = "imageMeta"; // 图片元数据存储表
const DB_IMAGE_CHUNK = "imageChunks"; // 大文件分片存储表
const CHUNK_SIZE = 4 * 1024 * 1024; // 单个分片大小：4MB

export interface StoredImageMeta {
  id: number;
  name: string;
  type: "folder" | "image";
  url: string;
  parentId: number;
  hash?: string; // 文件内容哈希值，用于去重
  createdAt?: number; // 创建时间戳
  updatedAt?: number; // 更新时间戳
  size?: number; // 文件大小
  chunkCount?: number; // 分片数量
  chunkSize?: number; // 分片大小
  data?: Blob; // 小文件直接存储的数据
  width?: number; // 图片宽度
  height?: number; // 图片高度
}

export interface imageChunkMeta {
  chunkId: string;
  imageHash: string;
  index: number;
  chunk: Blob;
}

/**
 * 将 ArrayBuffer 转换为十六进制字符串
 * @param buffer - 要转换的二进制数据
 * @returns 十六进制字符串
 */
const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * 计算 Blob 的哈希值，优先使用 SHA-256，失败时使用简单哈希
 * @param blob - 要计算哈希的文件数据
 * @returns 哈希值字符串
 */
async function hashBlob(blob: Blob): Promise<string> {
  try {
    // 优先使用 SHA-256 加密哈希
    const buf = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return toHex(digest);
  } catch (error) {
    console.log(error)
    // SHA-256 失败时使用简单的字符串哈希作为降级方案
    const text = await blob.text();
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * 将 IDBRequest 转换为 Promise，简化异步操作
 * @param request - IndexedDB 请求对象
 * @returns Promise 包装的请求结果
 */
const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IDB request error"));
  });

/**
 * 等待 IndexedDB 事务完成
 * @param tx - IndexedDB 事务对象
 * @returns Promise，事务完成时解析
 */
const waitForTransaction = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB transaction error"));
    tx.onabort = () => reject(tx.error ?? new Error("IDB transaction aborted"));
  });


const formateUrl = (url: string) => {
  const urlArr = url.split('/');
  for (let i = 0; i < urlArr.length; i++) {
    if (urlArr[i] == '..' && i !== 0) {
      urlArr.splice(i, 1);
    }
  }
  if (urlArr[0] !== '.' && urlArr[0] !== '..') {
    urlArr.unshift('.');
  }
  return urlArr.join('/');
}

/**
 * 处理 IndexedDB 存储配额错误和中断错误
 * @param error - 捕获的错误对象
 * @returns 处理后的错误对象
 */
const handleQuotaError = (error: unknown) => {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    message.error("Storage quota exceeded. Delete some images and try again.");
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    message.warning("Write aborted; retrying once.");
  }
  return error;
};

/**
 * 图片存储管理器，提供图片的存储、读取、删除等功能
 * 支持大文件分片存储和去重功能
 */
export class ImageStore {
  private urlCache = new Map<string, string>(); // 缓存已创建的 Blob URL
  private dbPromise: Promise<IDBDatabase>; // 数据库连接 Promise
  private idCounter = 0; // 时间后id计数器

  constructor(dbPromise: Promise<IDBDatabase>) {
    this.dbPromise = dbPromise;
  }

  /**
   * 获取数据库连接
   * @returns 数据库实例
   */
  private async db() {
    return this.dbPromise;
  }

  /**
   * 根据 URL 路径获取父文件夹的 ID
   * @param url - 图片的 URL 路径（如 "./folder/subfolder/image.jpg"）
   * @param db - 数据库连接
   * @returns 父文件夹的 ID，如果没有父文件夹则返回 0（根目录）
   */
  private async getUrlId(url: string, db: IDBDatabase): Promise<{
    id: number;
    type: "folder"  | "image";
  }> {
    // 格式化 URL，处理相对路径（如 ".."）
    url = formateUrl(url);
    const urlArr = url.split('/');

    // 如果 URL 只有一级（如 "./image.jpg"），则父文件夹是根目录（ID=0）
    if (urlArr.length < 2) {
      if (urlArr[0] === '.') {
        return {
          id: 1,
          type: "folder",
        };
      }
      else if (urlArr[0] === '..') {
        return {
          id: 2,
          type: "folder",
        };
      }
      else {
        console.log(url, "url格式化错误")
      }
    }

    // 获取父文件夹的路径（去掉文件名部分）
    const parentUrl = urlArr.slice(0, -1).join('/');

    // 在数据库中查找父文件夹记录
    const transaction = db.transaction(DB_IMAGE_META, "readonly");
    const store = transaction.objectStore(DB_IMAGE_META);
    const index = store.index("url");

    try {
      let UrlRecord : StoredImageMeta | undefined = await requestToPromise<StoredImageMeta | undefined>(index.get(url));
      if(!UrlRecord) {
        UrlRecord = await this.createFolder(parentUrl, db);
      }
      return {
        id: UrlRecord.id,
        type: UrlRecord.type,
      }

    } catch (error) {
      console.error("Failed to get parent ID:", error);
      return {
        id: 0,
        type: "folder",
      }; // 出错时返回根目录
    }
  }

  /**
   * 创建文件夹记录
   * @param folderUrl - 文件夹的 URL 路径
   * @param db - 数据库连接
   * @returns 新创建的文件夹 ID
   */
  private async createFolder(folderUrl: string, db: IDBDatabase): Promise<StoredImageMeta> {
    const now = Date.now();
    const folderId = now * 1000 + this.idCounter++;
    const folderName = folderUrl.split('/').pop() || "文件夹";

    // 递归创建父文件夹（如果需要）
    const parentUrl = folderUrl.split('/').slice(0, -1).join('/');
    let parentMeta = await this.getUrlId(parentUrl, db)
    if(parentMeta.type === "image") {
      const meta = await this.createFolder(parentUrl, db);
      parentMeta = {id: meta.id, type: meta.type};
    }
    const parentId = parentUrl ? parentMeta.id : 0;

    const folderMeta: StoredImageMeta = {
      id: folderId,
      name: folderName,
      type: "folder",
      url: folderUrl,
      parentId,
    };

    const transaction = db.transaction(DB_IMAGE_META, "readwrite");
    const store = transaction.objectStore(DB_IMAGE_META);
    store.put(folderMeta);

    await waitForTransaction(transaction);
    return folderMeta;
  }

  /**
   * 保存图片到 IndexedDB，支持去重和分片存储
   * @param file - 要存储的图片文件
   * @param name - 可选的文件名
   * @param parentId - 父文件夹 ID
   * @param url - 图片 URL
   * @returns 存储的图片元数据
   */
  async saveImage(file: Blob, name: string, url: string): Promise<StoredImageMeta> {
    const db = await this.db();
    url = formateUrl(url);
    const parentId = await this.getUrlId(url.split('/').slice(0, -1).join('/'), db);
    const now = Date.now();
    const id = now * 1000 + this.idCounter++; // 生成唯一 ID
    const hash = await hashBlob(file); // 计算文件哈希用于分块查找

    // 检查是否已存在相同哈希的文件，避免重复存储
    // const existing = await requestToPromise(
    //   db.transaction(DB_IMAGE_META, "readonly").objectStore(DB_IMAGE_META).index("hash").get(hash),
    // ).catch(() => undefined);
    // if (existing) return existing as StoredImageMeta;


    const meta: StoredImageMeta = {
      id,
      name: name ?? id,
      type: "image",
      url: url,
      parentId : parentId.id,
      size: file.size,
      hash,
      chunkCount: Math.ceil(file.size / CHUNK_SIZE),
      chunkSize: CHUNK_SIZE,
    };

    const tx = db.transaction([DB_IMAGE_META, DB_IMAGE_CHUNK], "readwrite");
    try {
      await this.saveChunked(tx, meta, file); // 大文件分片存储
      await waitForTransaction(tx);
      return meta;
    } catch (error) {
      tx.abort(); // 出错时回滚事务
      throw handleQuotaError(error);
    }
  }

  /**
   * 分片保存大文件
   * @param tx - 数据库事务
   * @param meta - 文件元数据
   * @param file - 要存储的文件
   */
  private async saveChunked(tx: IDBTransaction, meta: StoredImageMeta, file: Blob) {
    const chunkStore = tx.objectStore(DB_IMAGE_CHUNK);
    const total = meta.chunkCount ?? Math.ceil(file.size / CHUNK_SIZE);

    // 将文件分割成多个分片并存储
    for (let i = 0; i < total; i++) {
      const imageHash = meta.hash || "";
      const start = i * CHUNK_SIZE;
      const chunk = file.slice(start, start + CHUNK_SIZE);
      const chunkId = `${meta.id}:${i}`;
      const chunkMeta: imageChunkMeta = { chunkId, imageHash, index: i, chunk };
      chunkStore.put(chunkMeta)
    }
    tx.objectStore(DB_IMAGE_META).put(meta); // 存储元数据
  }

  /**
   * 根据 ID 获取图片元数据
   * @param id - 图片 ID
   * @returns 图片元数据，如果不存在则返回 undefined
   */
  async getMeta(id: string): Promise<StoredImageMeta | undefined> {
    const db = await this.db();
    const meta = await requestToPromise(
      db.transaction(DB_IMAGE_META, "readonly").objectStore(DB_IMAGE_META).get(id),
    );
    return meta ?? undefined;
  }

  /**
   * 分页获取图片列表
   * @param page - 页码（从1开始）
   * @param pageSize - 每页大小
   * @returns 包含图片列表和总数的对象
   */
  async list(page = 1, pageSize = 12): Promise<{ items: StoredImageMeta[]; total: number }> {
    const db = await this.db();
    const store = db.transaction(DB_IMAGE_META, "readonly").objectStore(DB_IMAGE_META);
    const all = (await requestToPromise(store.getAll())) as StoredImageMeta[];

    // 按创建时间倒序排序
    const sorted = all
      .filter(Boolean)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);
    return { items, total };
  }


  //获取文件夹下所有内容
  async ListFolderContent(url: string): Promise<StoredImageMeta[]> {
    const db = await this.db();
    const meta =  await this.getUrlId(url, db);
    if(meta.type === "image"){
      return [];
    }
    const all = await requestToPromise(
      db.transaction(DB_IMAGE_META, "readonly").objectStore(DB_IMAGE_META).index("parentId").getAll(),
    );
    const folderItems = all as StoredImageMeta[];
    return folderItems
  }

  /**
   * 读取分片存储的文件并重新组装
   * @param meta - 文件元数据
   * @returns 重新组装后的 Blob 对象
   */
  private async readChunked(meta: StoredImageMeta): Promise<Blob> {
    const db = await this.db();
    const index = db
      .transaction(DB_IMAGE_CHUNK, "readonly")
      .objectStore(DB_IMAGE_CHUNK)
      .index("imageHash");

    const chunks: Blob[] = [];
    // 遍历所有分片并按索引顺序组装
    await new Promise<void>((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(meta.hash));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve();
          return;
        }
        const value = cursor.value as { chunk: Blob; index: number };
        chunks[value.index] = value.chunk; // 按索引位置存储分片
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });
    return new Blob(chunks, { type: meta.type });
  }

  /**
   * 根据 ID 获取图片的 Blob 数据
   * @param id - 图片 ID
   * @returns 图片的 Blob 数据
   */
  async getBlob(id: string): Promise<Blob> {
    const meta = await this.getMeta(id);
    if (!meta) throw new Error("Image not found or already deleted");

    if (!meta.chunkCount) {
      // 小文件直接返回存储的数据
      if (!meta.data) throw new Error("Image data missing");
      return meta.data;
    }
    // 大文件需要重新组装分片
    return this.readChunked(meta);
  }

  /**
   * 获取图片的 Object URL，用于在页面上显示
   * @param id - 图片 ID
   * @returns 可用于 img.src 的 URL
   */
  async getObjectURL(id: string): Promise<string> {
    // 检查缓存，避免重复创建 URL
    if (this.urlCache.has(id)) return this.urlCache.get(id)!;

    const blob = await this.getBlob(id);
    const url = URL.createObjectURL(blob);
    this.urlCache.set(id, url); // 缓存 URL
    return url;
  }

  /**
   * 释放图片的 Object URL，避免内存泄漏
   * @param id - 图片 ID
   */
  revokeObjectURL(id: string) {
    const url = this.urlCache.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      this.urlCache.delete(id);
    }
  }

  /**
   * 删除单个图片及其所有分片
   * @param id - 要删除的图片 ID
   */
  async deleteImage(id: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction([DB_IMAGE_META, DB_IMAGE_CHUNK], "readwrite");

    // 删除元数据
    tx.objectStore(DB_IMAGE_META).delete(id);

    // 删除所有相关分片
    const index = tx.objectStore(DB_IMAGE_CHUNK).index("imageId");
    index.openCursor(IDBKeyRange.only(id)).onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        tx.objectStore(DB_IMAGE_CHUNK).delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    await waitForTransaction(tx);
    this.revokeObjectURL(id); // 释放 URL
  }

  /**
   * 删除所有图片数据，清理存储空间
   */
  async deleteAllImage() {
    const db = await this.db();
    const tx = db.transaction([DB_IMAGE_META, DB_IMAGE_CHUNK], "readwrite");

    // 清空所有表
    tx.objectStore(DB_IMAGE_CHUNK).clear();
    tx.objectStore(DB_IMAGE_META).clear();

    // 释放所有缓存的 URL
    for (const e of this.urlCache) {
      const id = e[0];
      await this.revokeObjectURL(id);
    }
    this.urlCache.clear();
  }

  /**
   * 批量导入多个图片文件
   * @param files - 文件列表或 FileList
   * @returns 导入成功的图片元数据列表
   */
  async bulkImport(files: FileList | File[]): Promise<StoredImageMeta[]> {
    // 过滤出图片文件
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const results: StoredImageMeta[] = [];

    for (const file of list) {
      let attempts = 0;
      // 在 AbortError 时重试一次
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const meta = await this.saveImage(file, file.name, './' + file.name);
          results.push(meta);
          break;
        } catch (error) {
          attempts += 1;
          if (
            error instanceof DOMException &&
            error.name === "AbortError" &&
            attempts < 2
          ) {
            await new Promise((r) => setTimeout(r, 40)); // 短暂延迟后重试
            continue;
          }
          throw handleQuotaError(error);
        }
      }
    }
    return results;
  }
}

/**
 * 创建图片存储管理器实例的工厂函数
 * @param dbPromise - 数据库连接 Promise
 * @returns ImageStore 实例
 */
export const createImageStore = (dbPromise: Promise<IDBDatabase>) => new ImageStore(dbPromise);
