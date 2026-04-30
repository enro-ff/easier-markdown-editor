import { chunkSize } from "./constants";
import { hashBlob } from "./hash";
import { request2Promise } from "./idb";
import type {
  ImageDimensions,
  StoredChunkMeta,
  StoredImageMeta,
  StoredMetaBase,
} from "./types";

export const getImageDimensions = async (
  blob: Blob,
): Promise<ImageDimensions | null> => {
  // 优先使用 createImageBitmap（更快，也不需要插入 DOM）
  try {
    if ("createImageBitmap" in window) {
      const bitmap = await createImageBitmap(blob);
      const dimensions = { width: bitmap.width, height: bitmap.height } as const;
      bitmap.close();
      return dimensions;
    }
  } catch {
    // fallback to HTMLImageElement
  }

  return await new Promise<ImageDimensions | null>((resolve) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      cleanup();
      if (!width || !height) {
        resolve(null);
        return;
      }
      resolve({ width, height });
    };

    img.onerror = () => {
      cleanup();
      resolve(null);
    };

    img.src = objectUrl;
  });
};

type ImageOpsContext = Readonly<{
  ensureReady: () => Promise<void>;
  getDb: () => IDBDatabase;
  createFileId: () => number;
  createUrlByParentId: (parentId: number, name: string) => Promise<string>;
  createChunkedId: (imageId: number, index: number) => string;
  deleteChunksByImageId: (imageId: number) => Promise<void>;
}>;

export type LocalImageUrl = string | Blob | undefined;

export class ImageOps {
  private urlMap: Map<string, string> = new Map();
  private static uploadQueues: Map<string, Promise<void>> = new Map();
  private ctx: ImageOpsContext;

  constructor(ctx: ImageOpsContext) {
    this.ctx = ctx;
  }

  private lockKey(parentId: number, name: string) {
    return `${parentId}:${name}`;
  }

  async uploadImage(file: File, parentId: number): Promise<void> {
    const lockKey = this.lockKey(parentId, file.name);

    const previousPromise =
      ImageOps.uploadQueues.get(lockKey) || Promise.resolve();

    const currentPromise = previousPromise.then(async () => {
      await this.ctx.ensureReady();
      const url = await this.ctx.createUrlByParentId(parentId, file.name);
      await this.doUploadImage(file, parentId, url);
    });

    ImageOps.uploadQueues.set(lockKey, currentPromise);

    try {
      return await currentPromise;
    } finally {
      const currentInMap = ImageOps.uploadQueues.get(lockKey);
      if (currentInMap === currentPromise) {
        ImageOps.uploadQueues.delete(lockKey);
      }
    }
  }

  private async doUploadImage(
    file: File,
    parentId: number,
    url: string,
  ): Promise<void> {
    console.log(Date.now(), "uploadImage start", file.name);
    const db = this.ctx.getDb();

    const hash = await hashBlob(file);
    const type = file.type || "image/jpeg";
    const dimensions = await getImageDimensions(file);
    const chunkCount = Math.ceil(file.size / chunkSize);

    // 1. 查找现有元数据
    const existing = (await request2Promise(
      db
        .transaction(["folders"], "readonly")
        .objectStore("folders")
        .index("url")
        .get(url),
    )) as StoredImageMeta | undefined;

    let imageId: number;
    let uploadedIndices = new Set<number>();

    if (existing && existing.type === "image") {
      imageId = existing.id;
      if (existing.hash === hash) {
        if (existing.width === undefined || existing.height === undefined) {
          if (dimensions) {
            existing.width = dimensions.width;
            existing.height = dimensions.height;
            await request2Promise(
              db
                .transaction(["folders"], "readwrite")
                .objectStore("folders")
                .put(existing),
            );
          }
        }

        const chunks = (await request2Promise(
          db
            .transaction(["chunks"], "readonly")
            .objectStore("chunks")
            .index("imageId")
            .getAll(imageId),
        )) as StoredChunkMeta[];

        uploadedIndices = new Set(chunks.map((c) => c.index));
        if (uploadedIndices.size === chunkCount) {
          console.log("文件已存在且完整，跳过上传");
          return;
        }
        console.log(
          `发现部分上传文件: ${file.name}, 已完成 ${uploadedIndices.size}/${chunkCount} 分片`,
        );
      } else {
        console.log("文件内容已更改，重新开始上传");
        await this.ctx.deleteChunksByImageId(imageId);
        uploadedIndices.clear();
        existing.hash = hash;
        existing.chunkCount = chunkCount;
        existing.mimeType = type;
        existing.size = file.size;
        if (dimensions) {
          existing.width = dimensions.width;
          existing.height = dimensions.height;
        } else {
          existing.width = undefined;
          existing.height = undefined;
        }
        await request2Promise(
          db
            .transaction(["folders"], "readwrite")
            .objectStore("folders")
            .put(existing),
        );
      }
    } else {
      imageId = this.ctx.createFileId();
      const imageMeta: StoredImageMeta = {
        id: imageId,
        type: "image",
        name: file.name,
        parentId,
        url,
        chunkCount,
        mimeType: type,
        hash,
        size: file.size,
        width: dimensions?.width,
        height: dimensions?.height,
      };
      try {
        await request2Promise(
          db
            .transaction(["folders"], "readwrite")
            .objectStore("folders")
            .add(imageMeta),
        );
      } catch (e: unknown) {
        const err = e as { name?: string };
        if (err.name === "ConstraintError") {
          console.warn("并发冲突：元数据已由其他进程创建，尝试切换到续传模式");
          return this.doUploadImage(file, parentId, url);
        }
        throw e;
      }
    }

    // 2. 逐个上传缺失的分片
    for (let i = 0; i < chunkCount; i++) {
      if (uploadedIndices.has(i)) continue;

      const chunkData = file.slice(i * chunkSize, (i + 1) * chunkSize);
      const chunkMeta: StoredChunkMeta = {
        id: this.ctx.createChunkedId(imageId, i),
        imageId,
        index: i,
        data: chunkData,
      };

      await request2Promise(
        db
          .transaction(["chunks"], "readwrite")
          .objectStore("chunks")
          .put(chunkMeta),
      );
      if (i % 5 === 0 || i === chunkCount - 1) {
        console.log(`上传进度: ${file.name} ${i + 1}/${chunkCount}`);
      }
    }

    console.log(Date.now(), "uploadImage success", file.name);
  }

  async createLocalURLByImageURL(url: string): Promise<LocalImageUrl> {
    await this.ctx.ensureReady();
    const db = this.ctx.getDb();

    if (this.urlMap.has(url)) return this.urlMap.get(url);

    const store = db.transaction(["folders"], "readonly").objectStore("folders");
    const files = (await request2Promise(
      store.index("url").getAll(url),
    )) as StoredMetaBase[];

    const imageMeta = files.find((a) => a.type === "image") as StoredImageMeta;
    if (!imageMeta) return url || "";

    const { id, mimeType } = imageMeta;
    const blobs: Blob[] = [];

    const chunks = (await request2Promise(
      db
        .transaction(["chunks"], "readonly")
        .objectStore("chunks")
        .index("imageId")
        .getAll(id),
    )) as StoredChunkMeta[];

    chunks.sort((a, b) => a.index - b.index);
    for (const c of chunks) {
      blobs.push(c.data);
    }

    const imageBlob = new Blob(blobs, { type: mimeType });
    if (imageBlob.size > 50 * 1024 * 1024) {
      return imageBlob;
    }

    const newURL = URL.createObjectURL(imageBlob) || "";
    this.urlMap.set(url, newURL);
    return newURL;
  }

  releaseURL(url: string) {
    const localUrl = this.urlMap.get(url) || "";
    if (localUrl === "") return;
    URL.revokeObjectURL(localUrl);
    this.urlMap.delete(url);
  }
}
