import buildDataTree from "./buildDataTree";

const chunkSize = 4 * 1024 * 1024 //分块大小

//将IDBRequest转换为Promise
const request2Promise = <T>(request: IDBRequest<T>) => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 将 ArrayBuffer 转换为十六进制字符串
 */
const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * 计算 Blob 的哈希值
 */
async function hashBlob(blob: Blob): Promise<string> {
  try {
    const buf = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return toHex(digest);
  } catch (error) {
    console.warn("SHA-256 failed, using fallback hash", error);
    const text = await blob.text();
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

export class ImagefolderStore {
  private db!: IDBDatabase;
  private idx: number = 0;
  private urlMap: Map<string, string> = new Map();
  private ready: Promise<void>
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
  //创建文件id
  private createFileId() {
    return Date.now() * 1000 + this.idx++;
  }

  //格式化url，用。/或。。/开头
  private formatUrl(url: string) {
    const urlArr = url.split("/");
    if (urlArr[0] !== "." && urlArr[0] !== "..") {
      urlArr.unshift(".");
    }
    return urlArr.join("/");
  }
  //根据父文件夹id和子文件名生成url
  private async createUrlByParentId(parentId: number, name: string) {
    const parentMeta = await this.getFileById(parentId);
    const parentUrl = parentMeta === undefined ? './' : parentMeta.url;
    return this.formatUrl(parentUrl + '/' + name);
  }

  //生成分片的唯一id，使用字符串避免与 imageId 冲突
  private createChunkedId = (imageId: number, index: number) => {
       return `${imageId}-${index}`;
  }

  private async storeChunks(chunksMeta: StoredChunkMeta[]) {
    for (const meta of chunksMeta) {
      await request2Promise(this.db.transaction(['chunks'], 'readwrite').objectStore('chunks').put(meta))
    }
  }

  private async deleteChunksByImageId(imageId: number) {
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');
      const index = store.index('imageId');
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

  //查询父文件夹url
  async queryParentFolderUrl(folderUrl: string) {
    const parentUrl = this.formatUrl(folderUrl).split("/").slice(0, -1).join("/");
    return parentUrl;
  }

  //获取所有文件夹
  async queryAllFolders() {
    await this.ensureReady();
    const store = this.db.transaction(["folders"], "readonly").objectStore("folders");
    const request = store.getAll();
    const result = await request2Promise(request);
    if (result !== undefined) {
      return buildDataTree(result as StoredFolderMeta[]);
    }
    return [];
  }

  //根据文件夹id获取文件夹元数据
  async getFileById(id: number) {
    await this.ensureReady();
    const store = this.db.transaction(["folders"], "readonly").objectStore("folders");
    const request = store.get(id);
    const result = await request2Promise(request);
    return result as StoredFolderMeta | StoredImageMeta | undefined;
  }

  //根据父文件夹id创建文件夹
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
    const store = this.db.transaction(["folders"], "readwrite").objectStore("folders");
    await request2Promise(store.add(folderMeta));
    return folderMeta;
  }

  //根据文件夹id获取所有子文件夹
  async getSubFolderById(id: number) {
    await this.ensureReady();
    const result = await request2Promise(this.db.transaction(["folders"], "readonly").objectStore("folders").index("parentId").getAll(id)) as StoredMetaBase[];
    return result || [];
  }

  //删除文件夹及所有子文件夹和文件
  async deleteFileById(id: number) {
    await this.ensureReady();
    const meta = await this.getFileById(id);
    if (meta === undefined) return;
    if (meta.type === "image") {
      await this.deleteChunksByImageId(id);
    }
    const store = this.db.transaction(["folders"], "readwrite").objectStore("folders");
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

  //更改文件夹命名
  async changeFolderNameById(id: number, name: string) {
    await this.ensureReady();
    const folderMeta = await this.getFileById(id);
    if (!folderMeta) return;
    folderMeta.name = name;
    const store = this.db.transaction(["folders"], "readwrite").objectStore("folders");
    await request2Promise(store.put(folderMeta));
  }

  //上传图片（支持断点续传）
  async uploadImage(file: File, parentId: number) {
    await this.ensureReady();
    console.log(Date.now(), 'uploadImage start', file.name);
    
    const url = await this.createUrlByParentId(parentId, file.name);
    const hash = await hashBlob(file);
    const type = file.type || "image/jpeg";
    const chunkCount = Math.ceil(file.size / chunkSize);

    // 1. 查找现有元数据
    const folderStore = this.db.transaction(["folders"], "readonly").objectStore("folders");
    const existing = await request2Promise(folderStore.index("url").get(url)) as StoredImageMeta | undefined;

    let imageId: number;
    let uploadedIndices = new Set<number>();

    if (existing && existing.type === "image") {
      imageId = existing.id;
      if (existing.hash === hash) {
        // 哈希匹配，检查已存在的分片
        const chunks = await request2Promise(
          this.db.transaction(['chunks'], 'readonly')
            .objectStore('chunks')
            .index('imageId')
            .getAll(imageId)
        ) as StoredChunkMeta[];
        
        uploadedIndices = new Set(chunks.map(c => c.index));
        if (uploadedIndices.size === chunkCount) {
          console.log('文件已存在且完整，跳过上传');
          return;
        }
        console.log(`发现部分上传文件，已完成 ${uploadedIndices.size}/${chunkCount} 分片`);
      } else {
        // 哈希不匹配，说明文件内容变了，删除旧分片并更新元数据
        console.log('文件内容已更改，重新开始上传');
        await this.deleteChunksByImageId(imageId);
        uploadedIndices.clear();
        existing.hash = hash;
        existing.chunkCount = chunkCount;
        existing.mimeType = type;
        existing.size = file.size;
        await request2Promise(this.db.transaction(["folders"], "readwrite").objectStore("folders").put(existing));
      }
    } else {
      // 新文件上传
      imageId = this.createFileId();
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
      };
      await request2Promise(this.db.transaction(["folders"], "readwrite").objectStore("folders").add(imageMeta));
    }

    // 2. 逐个上传缺失的分片
    for (let i = 0; i < chunkCount; i++) {
      if (uploadedIndices.has(i)) continue;

      const chunkData = file.slice(i * chunkSize, (i + 1) * chunkSize);
      const chunkMeta: StoredChunkMeta = {
        id: this.createChunkedId(imageId, i),
        imageId,
        index: i,
        data: chunkData
      };
      
      await request2Promise(this.db.transaction(['chunks'], 'readwrite').objectStore('chunks').put(chunkMeta));
      if (i % 5 === 0 || i === chunkCount - 1) {
        console.log(`上传进度: ${i + 1}/${chunkCount}`);
      }
    }

    console.log(Date.now(), 'uploadImage success', file.name);
  }

  //根据url制作本地url
  createLocalURLByImageURL = async (url: string) => {
    await this.ensureReady()
    if (!this.db) return url;
    if (this.urlMap.has(url)) return this.urlMap.get(url);
    const store = this.db.transaction(["folders"], 'readonly').objectStore('folders');
    const Files = await request2Promise(store.index('url').getAll(url)) as StoredMetaBase[]
    const imageMeta = Files.find((a) => a.type === 'image') as StoredImageMeta;
    if (!imageMeta) return url || "";
    const { id, mimeType } = imageMeta;
    console.log(id, mimeType)
    const blobs: Blob[] = []
    const chunks = await request2Promise(this.db.transaction(['chunks'], 'readonly').objectStore('chunks').index('imageId').getAll(id)) as StoredChunkMeta[]
    console.log(chunks)
    chunks.sort((a, b) => a.index - b.index)
    console.log(chunks)
    for (let c of chunks) {
      blobs.push(c.data)
    }
    console.log(blobs)
    
    const imageBlob = new Blob(blobs, { type: mimeType })
    if(imageBlob.size > 50*1024*1024) {
      return imageBlob
    }
    console.log(imageBlob)
    const newURL = URL.createObjectURL(imageBlob) || "";
    this.urlMap.set(url, newURL);
    return newURL

  }

  //释放本地url
  async releaseURL(url: string) {
    url = this.urlMap.get(url) || "";
    if (url === "") return;
    URL.revokeObjectURL(url);
    this.urlMap.delete(url);
  }

  // 在 ImagefolderStore 类中添加以下方法

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
      const relativePath = (file as any).webkitRelativePath; // 格式: "folder/sub/file.jpg"
      if (!relativePath) continue;

      const parts = relativePath.split('/');
      parts.pop()
      const dirPath = parts.join('/'); // 文件夹路径（相对于所选根目录）

      fileInfos.push({ file, relativePath, dirPath });
    }

    // 2. 收集所有需要创建的文件夹路径（去重）
    const folderPaths = new Set<string>();
    for (const { dirPath } of fileInfos) {
      if (dirPath === '') continue; // 根目录本身不需要创建
      const parts = dirPath.split('/');
      for (let i = 1; i <= parts.length; i++) {
        folderPaths.add(parts.slice(0, i).join('/'));
      }
    }

    // 3. 按深度排序（确保父文件夹先创建）
    const sortedPaths = Array.from(folderPaths).sort((a, b) => a.split('/').length - b.split('/').length);

    // 4. 维护路径 -> 文件夹ID 的映射
    const folderIdMap = new Map<string, number>();
    folderIdMap.set('', rootParentId); // 空路径对应根文件夹

    // 5. 逐级创建文件夹
    for (const path of sortedPaths) {
      const parts = path.split('/');
      const parentPath = parts.slice(0, -1).join('/');
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
      if (file.type.startsWith('image/')) {
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
  private async getSubFolderByName(parentId: number, name: string): Promise<StoredFolderMeta | undefined> {
    const store = this.db.transaction(['folders'], 'readonly').objectStore('folders');
    const index = store.index('parentId');
    const request = index.getAll(parentId);
    const children = await request2Promise(request) as StoredMetaBase[];
    return children.find(c => c.type === 'folder' && c.name === name) as StoredFolderMeta | undefined;
  }

}

export default (dbPromise: Promise<IDBDatabase>) => {
  return new ImagefolderStore(dbPromise);
}

export interface StoredMetaBase {
  id: number;
  type: "folder" | "image";
  name: string;
  parentId: number;
  url: string;
}

export interface StoredImageMeta extends StoredMetaBase {
  type: "image";
  hash: string;
  size: number;
  chunkCount: number;
  mimeType: string;
}

export interface StoredFolderMeta extends StoredMetaBase {
  type: "folder";
}

export interface StoredChunkMeta {
  id: string | number;
  imageId: number;
  index: number;
  data: Blob;
}