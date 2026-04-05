import buildDataTree from "./buildDataTree";

const chunkSize = 4 * 1024 * 1024 //分块大小

//将IDBRequest转换为Promise
const request2Promise = <T>(request: IDBRequest<T>) => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

export class ImagefolderStore {
  private db!: IDBDatabase;
  private idx: number = 0;
  private urlMap: Map<string, string> = new Map();

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
    const parentMeta = await this.getFolderById(parentId);
    const parentUrl = parentMeta === undefined ? './' : parentMeta.url;
    return this.formatUrl(parentUrl + '/' + name);
  }

  //生成分片的唯一id
  private createChunkedId = (imageId: number, index: number) => {
    return imageId * 1000 + index;
  }

  private async storeChunks(chunksMeta: StoredChunkMeta[]) {
    for (const meta of chunksMeta) {
      await request2Promise(this.db.transaction(['chunks'], 'readwrite').objectStore('chunks').add(meta))
    }
  }
  //查询父文件夹url
  async queryParentFolderUrl(folderUrl: string) {
    const parentUrl = this.formatUrl(folderUrl).split("/").slice(0, -1).join("/");
    return parentUrl;
  }

  constructor(dbPromise: Promise<IDBDatabase>) {
    dbPromise.then(db => {
      this.db = db;
    });
  }

  //获取所有文件夹
  async queryAllFolders() {
    const store = this.db.transaction(["folders"], "readonly").objectStore("folders");
    const request = store.getAll();
    const result = await request2Promise(request);
    console.log("queryAllFolders: result", result);
    if (result !== undefined) {
      return buildDataTree(result as StoredFolderMeta[]);
    }
    return [];
  }

  //根据文件夹id获取文件夹元数据
  async getFolderById(id: number) {
    const store = this.db.transaction(["folders"], "readonly").objectStore("folders");
    const request = store.get(id);
    const result = await request2Promise(request);
    return result as StoredFolderMeta | undefined;
  }

  //根据父文件夹id创建文件夹
  async createFolderByParentId(parentId: number, name: string) {
    const parentMeta = await this.getFolderById(parentId);
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
    const result = await request2Promise(this.db.transaction(["folders"], "readonly").objectStore("folders").index("parentId").getAll(id)) as StoredMetaBase[];
    return result || [];
  }

  //删除文件夹及所有子文件夹和文件
  async deleteFolderById(id: number) {
    const subFolderList = await this.getSubFolderById(id);
    if (subFolderList.length === 0) {
      return;
    }
    subFolderList.forEach(async (subFolder) => {
      await this.deleteFolderById(subFolder.id);
    })
    const store = this.db.transaction(["folders"], "readwrite").objectStore("folders");
    await request2Promise(store.delete(id));
  }

  //更改文件夹命名
  async changeFolderNameById(id: number, name: string) {
    const folderMeta = await this.getFolderById(id);
    folderMeta!.name = name;
    const store = this.db.transaction(["folders"], "readwrite").objectStore("folders");
    await request2Promise(store.put(folderMeta));
  }

  //上传图片
  async uploadImage(file: File, parentId: number) {
    const url = await this.createUrlByParentId(parentId, file.name);
    const chunkCount = Math.ceil(file.size / chunkSize);
    console.log(file.size)
    const imageBlob = file.slice()
    const imageMeta: StoredImageMeta = {
      id: this.createFileId(),
      type: "image",
      name: file.name,
      parentId,
      url,
      chunkCount,
      mimeType: imageBlob.type,
    }
    const chunksMeta: StoredChunkMeta[] = [];
    for (let i = 0; i < chunkCount; i++) {
      chunksMeta.push({
        id: this.createChunkedId(imageMeta.id, i),
        imageId: imageMeta.id,
        index: i,
        data: imageBlob.slice(i * chunkSize, (i + 1) * chunkSize)
      })
    }
    await this.storeChunks(chunksMeta);
    await request2Promise(this.db.transaction(["folders"], 'readwrite').objectStore('folders').add(imageMeta))
  }

  //根据url制作本地url
  async createLocalURLByImageURL(url: string) {
    if(this.urlMap.has(url))return this.urlMap.get(url);
    const store = this.db.transaction(["folders"], 'readwrite').objectStore('folders');
    console.log(url)
    const Files = await request2Promise(store.index('url').getAll(url)) as StoredMetaBase[]
    console.log(Files,"fildes")
    const imageMeta = Files.find((a) => a.type === 'image') as StoredImageMeta;
    if (!imageMeta) return url;
    const {id, mimeType} = imageMeta;
    console.log(imageMeta)
    const blobs : Blob[] = []
    const chunks = await request2Promise(this.db.transaction(['chunks'], 'readwrite').objectStore('chunks').index('imageId').getAll(id)) as StoredChunkMeta[]
    console.log(chunks)
    chunks.sort((a, b) => a.index - b.index)
    for(let c of chunks){
      blobs.push(c.data)
    }
    const imageBlob = new Blob(blobs, {type: mimeType})
    console.log(imageBlob)
    const newURL = URL.createObjectURL(imageBlob);
    this.urlMap.set(url, newURL);
    console.log(newURL)
    return newURL
  }

  //释放本地url
  async releaseURL(url: string) {
    url = this.urlMap.get(url) || "";
    if(url === "")return;
    URL.revokeObjectURL(url);
    this.urlMap.delete(url);
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
  // hash: string;
  // size: number;
  chunkCount: number;
  mimeType: string;
}

export interface StoredFolderMeta extends StoredMetaBase {
  type: "folder";
}

export interface StoredChunkMeta {
  id: number;
  imageId: number;
  index: number;
  data: Blob;
}