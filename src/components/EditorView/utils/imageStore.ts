import { message } from "antd";

const DB_IMAGE_META = "imageMeta";
const DB_IMAGE_CHUNK = "imageChunks";
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB
const BIG_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB

export interface StoredImageMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  hash: string;
  createdAt: number;
  updatedAt: number;
  chunked: boolean;
  chunkCount?: number;
  chunkSize?: number;
  data?: Blob;
  width?: number;
  height?: number;
}

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

async function hashBlob(blob: Blob): Promise<string> {
  try {
    const buf = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return toHex(digest);
  } catch (error) {
    console.log(error)
    const text = await blob.text();
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IDB request error"));
  });

const waitForTransaction = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB transaction error"));
    tx.onabort = () => reject(tx.error ?? new Error("IDB transaction aborted"));
  });

const getExtFromName = (name?: string, mime?: string) => {
  if (name && name.includes(".")) return name.slice(name.lastIndexOf("."));
  if (mime && mime.includes("/")) return `.${mime.split("/")[1]}`;
  return "";
};

const handleQuotaError = (error: unknown) => {
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    message.error("Storage quota exceeded. Delete some images and try again.");
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    message.warning("Write aborted; retrying once.");
  }
  return error;
};

export class ImageStore {
  private urlCache = new Map<string, string>();
  private dbPromise: Promise<IDBDatabase>;

  constructor(dbPromise: Promise<IDBDatabase>) {
    this.dbPromise = dbPromise;
  }

  private async db() {
    return this.dbPromise;
  }

  async saveImage(file: Blob, name?: string): Promise<StoredImageMeta> {
    const db = await this.db();
    const hash = await hashBlob(file);
    const ext = getExtFromName(name, file.type);
    const id = `sha256-${hash}${ext}`;
    const now = Date.now();

    const existing = await requestToPromise(
      db.transaction(DB_IMAGE_META, "readonly").objectStore(DB_IMAGE_META).index("hash").get(hash),
    ).catch(() => undefined);
    if (existing) return existing as StoredImageMeta;

    const chunked = file.size > BIG_FILE_THRESHOLD;
    const meta: StoredImageMeta = {
      id,
      name: name ?? id,
      type: file.type || "application/octet-stream",
      size: file.size,
      hash,
      createdAt: now,
      updatedAt: now,
      chunked,
      chunkCount: chunked ? Math.ceil(file.size / CHUNK_SIZE) : undefined,
      chunkSize: chunked ? CHUNK_SIZE : undefined,
    };

    const tx = db.transaction([DB_IMAGE_META, DB_IMAGE_CHUNK], "readwrite");
    try {
      if (chunked) {
        await this.saveChunked(tx, meta, file);
      } else {
        tx.objectStore(DB_IMAGE_META).put({ ...meta, data: file });
      }
      await waitForTransaction(tx);
      return meta;
    } catch (error) {
      tx.abort();
      throw handleQuotaError(error);
    }
  }

  private async saveChunked(tx: IDBTransaction, meta: StoredImageMeta, file: Blob) {
    const chunkStore = tx.objectStore(DB_IMAGE_CHUNK);
    const total = meta.chunkCount ?? Math.ceil(file.size / CHUNK_SIZE);
    for (let i = 0; i < total; i++) {
      const start = i * CHUNK_SIZE;
      const chunk = file.slice(start, start + CHUNK_SIZE);
      const chunkId = `${meta.id}:${i}`;
      chunkStore.put({ id: chunkId, imageId: meta.id, index: i, chunk });
    }
    tx.objectStore(DB_IMAGE_META).put(meta);
  }

  async getMeta(id: string): Promise<StoredImageMeta | undefined> {
    const db = await this.db();
    const meta = await requestToPromise(
      db.transaction(DB_IMAGE_META, "readonly").objectStore(DB_IMAGE_META).get(id),
    );
    return meta ?? undefined;
  }

  async list(page = 1, pageSize = 12): Promise<{ items: StoredImageMeta[]; total: number }> {
    const db = await this.db();
    const store = db.transaction(DB_IMAGE_META, "readonly").objectStore(DB_IMAGE_META);
    const all = (await requestToPromise(store.getAll())) as StoredImageMeta[];
    const sorted = all
      .filter(Boolean)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);
    return { items, total };
  }

  private async readChunked(meta: StoredImageMeta): Promise<Blob> {
    const db = await this.db();
    const index = db
      .transaction(DB_IMAGE_CHUNK, "readonly")
      .objectStore(DB_IMAGE_CHUNK)
      .index("imageId");

    const chunks: Blob[] = [];
    await new Promise<void>((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(meta.id));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve();
          return;
        }
        const value = cursor.value as { chunk: Blob; index: number };
        chunks[value.index] = value.chunk;
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });
    return new Blob(chunks, { type: meta.type });
  }

  async getBlob(id: string): Promise<Blob> {
    const meta = await this.getMeta(id);
    if (!meta) throw new Error("Image not found or already deleted");
    if (!meta.chunked) {
      if (!meta.data) throw new Error("Image data missing");
      return meta.data;
    }
    return this.readChunked(meta);
  }

  async getObjectURL(id: string): Promise<string> {
    if (this.urlCache.has(id)) return this.urlCache.get(id)!;
    const blob = await this.getBlob(id);
    const url = URL.createObjectURL(blob);
    this.urlCache.set(id, url);
    return url;
  }

  revokeObjectURL(id: string) {
    const url = this.urlCache.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      this.urlCache.delete(id);
    }
  }

  async deleteImage(id: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction([DB_IMAGE_META, DB_IMAGE_CHUNK], "readwrite");
    tx.objectStore(DB_IMAGE_META).delete(id);
    const index = tx.objectStore(DB_IMAGE_CHUNK).index("imageId");
    index.openCursor(IDBKeyRange.only(id)).onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        tx.objectStore(DB_IMAGE_CHUNK).delete(cursor.primaryKey);
        cursor.continue();
      }
    };
    await waitForTransaction(tx);
    this.revokeObjectURL(id);
  }

  async deleteAllImage() {
    const db = await this.db();
    const tx = db.transaction([DB_IMAGE_META, DB_IMAGE_CHUNK], "readwrite");
    tx.objectStore(DB_IMAGE_CHUNK).clear();
    tx.objectStore(DB_IMAGE_META).clear();
    for(const e of this.urlCache){
      const id = e[0];
      await this.revokeObjectURL(id);
    }
    this.urlCache.clear();
  }

  async bulkImport(files: FileList | File[]): Promise<StoredImageMeta[]> {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const results: StoredImageMeta[] = [];
    for (const file of list) {
      let attempts = 0;
      // retry once on AbortError
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const meta = await this.saveImage(file, file.name);
          results.push(meta);
          break;
        } catch (error) {
          attempts += 1;
          if (
            error instanceof DOMException &&
            error.name === "AbortError" &&
            attempts < 2
          ) {
            await new Promise((r) => setTimeout(r, 40));
            continue;
          }
          throw handleQuotaError(error);
        }
      }
    }
    return results;
  }
}

export const createImageStore = (dbPromise: Promise<IDBDatabase>) => new ImageStore(dbPromise);
