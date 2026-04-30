import buildDataTree from "../buildDataTree";
import { request2Promise } from "./idb";
import { ImageOps, type LocalImageUrl } from "./image";
import type {
  StoredFolderMeta,
  StoredImageMeta,
  StoredMetaBase,
} from "./types";

export class ImagefolderStore {
  private db!: IDBDatabase;
  private idx: number = 0;
  private ready: Promise<void>;
  private imageOps: ImageOps | null = null;

  constructor(dbPromise: Promise<IDBDatabase>) {
    // 确保 ready 能够被 await
    this.ready = dbPromise.then((database) => {
      this.db = database;
    });
  }

  // 必须确保这个方法在调用 db 之前运行
  private async ensureReady() {
    if (!this.db) {
      await this.ready;
    }
  }

  // 创建文件 id
  private createFileId() {
    return Date.now() * 1000 + this.idx++;
  }

  // 格式化 url，用 ./ 或 ../ 开头
  private formatUrl(url: string) {
    const urlArr = url.split("/");
    if (urlArr[0] !== "." && urlArr[0] !== "..") {
      urlArr.unshift(".");
    }
    return urlArr.join("/");
  }

  // 根据父文件夹 id 和子文件名生成 url
  private async createUrlByParentId(parentId: number, name: string) {
    const parentMeta = await this.getFileById(parentId);
    const parentUrl = parentMeta === undefined ? "./" : parentMeta.url;
    return this.formatUrl(parentUrl + "/" + name);
  }

  // 生成分片的唯一 id，使用字符串避免与 imageId 冲突
  private createChunkedId = (imageId: number, index: number) => {
    return `${imageId}-${index}`;
  };

  private async deleteChunksByImageId(imageId: number) {
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db.transaction(["chunks"], "readwrite");
      const store = transaction.objectStore("chunks");
      const index = store.index("imageId");
      const request = index.openCursor(IDBKeyRange.only(imageId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async getImageOps() {
    await this.ensureReady();
    if (this.imageOps) return this.imageOps;
    this.imageOps = new ImageOps({
      ensureReady: () => this.ensureReady(),
      getDb: () => this.db,
      createFileId: () => this.createFileId(),
      createUrlByParentId: (parentId, name) =>
        this.createUrlByParentId(parentId, name),
      createChunkedId: (imageId, index) => this.createChunkedId(imageId, index),
      deleteChunksByImageId: (imageId) => this.deleteChunksByImageId(imageId),
    });
    return this.imageOps;
  }

  // 查询父文件夹 url
  async queryParentFolderUrl(folderUrl: string) {
    const parentUrl = this.formatUrl(folderUrl)
      .split("/")
      .slice(0, -1)
      .join("/");
    return parentUrl;
  }

  // 获取所有文件夹
  async queryAllFolders() {
    await this.ensureReady();
    const store = this.db
      .transaction(["folders"], "readonly")
      .objectStore("folders");
    const request = store.getAll();
    const result = await request2Promise(request);
    if (result !== undefined) {
      return buildDataTree(result as StoredFolderMeta[]);
    }
    return [];
  }

  // 根据文件夹 id 获取文件夹元数据
  async getFileById(id: number) {
    await this.ensureReady();
    const store = this.db
      .transaction(["folders"], "readonly")
      .objectStore("folders");
    const request = store.get(id);
    const result = await request2Promise(request);
    return result as StoredFolderMeta | StoredImageMeta | undefined;
  }

  // 根据父文件夹 id 创建文件夹
  async createFolderByParentId(parentId: number, name: string) {
    await this.ensureReady();
    const parentMeta = await this.getFileById(parentId);
    const url = parentMeta!.url + "/" + name;
    const folderMeta: StoredFolderMeta = {
      type: "folder",
      id: this.createFileId(),
      name,
      parentId,
      url: this.formatUrl(url),
    };
    const store = this.db
      .transaction(["folders"], "readwrite")
      .objectStore("folders");
    await request2Promise(store.add(folderMeta));
    return folderMeta;
  }

  // 根据文件夹 id 获取所有子文件夹
  async getSubFolderById(id: number) {
    await this.ensureReady();
    const result = (await request2Promise(
      this.db
        .transaction(["folders"], "readonly")
        .objectStore("folders")
        .index("parentId")
        .getAll(id),
    )) as StoredMetaBase[];
    return result || [];
  }

  // 删除文件夹及所有子文件夹和文件
  async deleteFileById(id: number) {
    await this.ensureReady();
    const meta = await this.getFileById(id);
    if (meta === undefined) return;
    if (meta.type === "image") {
      await this.deleteChunksByImageId(id);
    }
    const store = this.db
      .transaction(["folders"], "readwrite")
      .objectStore("folders");
    await request2Promise(store.delete(id));
    if (meta.type === "folder") {
      const subFolderList = await this.getSubFolderById(id);
      if (subFolderList.length === 0) {
        return;
      }
      for (const subFolder of subFolderList) {
        await this.deleteFileById(subFolder.id);
      }
    }
  }

  // 更改文件夹命名
  async changeFolderNameById(id: number, name: string) {
    await this.ensureReady();
    const folderMeta = await this.getFileById(id);
    if (!folderMeta) return;
    folderMeta.name = name;
    const store = this.db
      .transaction(["folders"], "readwrite")
      .objectStore("folders");
    await request2Promise(store.put(folderMeta));
  }

  // 上传图片（支持断点续传与并发处理）
  async uploadImage(file: File, parentId: number): Promise<void> {
    const ops = await this.getImageOps();
    return ops.uploadImage(file, parentId);
  }

  // 根据 url 制作本地 url
  createLocalURLByImageURL = async (url: string): Promise<LocalImageUrl> => {
    const ops = await this.getImageOps();
    return ops.createLocalURLByImageURL(url);
  };

  // 释放本地 url
  async releaseURL(url: string) {
    const ops = await this.getImageOps();
    ops.releaseURL(url);
  }

  /**
   * 从 webkitdirectory 得到的 FileList 上传整个文件夹
   * @param files 通过 <input webkitdirectory> 获得的 FileList
   * @param rootParentId 目标根文件夹的 ID（上传的文件/文件夹将放在该文件夹下）
   */
  async uploadFolderFromWebkitFileList(files: FileList, rootParentId: number) {
    await this.ensureReady();

    // 1. 收集所有文件的相对路径信息
    type FileInfo = { file: File; relativePath: string; dirPath: string };
    const fileInfos: FileInfo[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = (file as unknown as { webkitRelativePath?: string })
        .webkitRelativePath; // 格式: "folder/sub/file.jpg"
      if (!relativePath) continue;

      const parts = relativePath.split("/");
      parts.pop();
      const dirPath = parts.join("/"); // 文件夹路径（相对于所选根目录）

      fileInfos.push({ file, relativePath, dirPath });
    }

    // 2. 收集所有需要创建的文件夹路径（去重）
    const folderPaths = new Set<string>();
    for (const { dirPath } of fileInfos) {
      if (dirPath === "") continue; // 根目录本身不需要创建
      const parts = dirPath.split("/");
      for (let i = 1; i <= parts.length; i++) {
        folderPaths.add(parts.slice(0, i).join("/"));
      }
    }

    // 3. 按深度排序（确保父文件夹先创建）
    const sortedPaths = Array.from(folderPaths).sort(
      (a, b) => a.split("/").length - b.split("/").length,
    );

    // 4. 维护路径 -> 文件夹 ID 的映射
    const folderIdMap = new Map<string, number>();
    folderIdMap.set("", rootParentId); // 空路径对应根文件夹

    // 5. 逐级创建文件夹
    for (const path of sortedPaths) {
      const parts = path.split("/");
      const parentPath = parts.slice(0, -1).join("/");
      const parentId = folderIdMap.get(parentPath);
      if (!parentId) throw new Error(`Parent folder not found for path: ${path}`);

      const folderName = parts[parts.length - 1];

      // 检查是否已存在同名子文件夹
      const existing = await this.getSubFolderByName(parentId, folderName);
      if (existing) {
        folderIdMap.set(path, existing.id);
      } else {
        const newFolder = await this.createFolderByParentId(parentId, folderName);
        folderIdMap.set(path, newFolder.id);
      }
    }

    // 6. 并行上传所有图片文件
    const uploadPromises = fileInfos.map(async ({ file, dirPath }) => {
      const parentId = folderIdMap.get(dirPath) ?? rootParentId;
      // 仅上传图片类型（可根据需要调整）
      if (file.type.startsWith("image/")) {
        await this.uploadImage(file, parentId);
      } else {
        console.warn(`Skipping non-image file: ${file.name}`);
      }
    });

    await Promise.all(uploadPromises);
  }

  /**
   * 根据父文件夹 ID 和名称获取子文件夹（如果存在）
   */
  private async getSubFolderByName(
    parentId: number,
    name: string,
  ): Promise<StoredFolderMeta | undefined> {
    const store = this.db.transaction(["folders"], "readonly").objectStore("folders");
    const index = store.index("parentId");
    const request = index.getAll(parentId);
    const children = (await request2Promise(request)) as StoredMetaBase[];
    return children.find((c) => c.type === "folder" && c.name === name) as
      | StoredFolderMeta
      | undefined;
  }
}
