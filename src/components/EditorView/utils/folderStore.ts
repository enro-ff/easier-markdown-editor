import buildDataTree from "./buildDataTree";

//将IDBRequest转换为Promise
const request2Promise = <T>(request: IDBRequest<T>) => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

class ImagefolderStore {
  private db!: IDBDatabase;
  private idx: number = 0;

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
    const result: StoredFolderMeta[] | undefined = await request2Promise(request);
    console.log("queryAllFolders: result", result);
    if (result) {
      console.log(buildDataTree(result));
      return buildDataTree(result);
    }
    return [];
  }
  
  //根据文件夹id获取文件夹元数据
  async getFolderById(id: number) {
    const store = this.db.transaction(["folders"], "readonly").objectStore("folders");
    const request = store.get(id);
    const result: StoredFolderMeta | undefined = await request2Promise(request);
    return result;
  }

  //根据父文件夹id创建文件夹
  async createFolderByParentId(parentId: number, name: string) {
    const parentMeta = await this.getFolderById(parentId);
    const url = parentMeta!.url +"/" + name;
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
  async getSubFolderById(id:number){
    const result : StoredFolderMeta[] | undefined = await request2Promise(this.db.transaction(["folders"], "readonly").objectStore("folders").index("parentId").getAll(id));
    return result || [];
  }

  //删除文件夹及所有子文件夹和文件
  async deleteFolderById(id: number){
    const subFolderList = await this.getSubFolderById(id);
    if(subFolderList.length === 0){
      return;
    }
    subFolderList.forEach(async (subFolder) => {
      await this.deleteFolderById(subFolder.id);
    })
    const store = this.db.transaction(["folders"], "readwrite").objectStore("folders");
    await request2Promise(store.delete(id));
  }

  //更改文件夹命名
  async changeFolderNameById(id: number, name: string){
    const folderMeta = await this.getFolderById(id);
    folderMeta!.name = name;
    const store = this.db.transaction(["folders"], "readwrite").objectStore("folders");
    await request2Promise(store.put(folderMeta));
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
  hash?: string;
  size?: number;
  chunkCount?: number;
  chunkSize?: number;
}

export interface StoredFolderMeta extends StoredMetaBase {
  type: "folder";
}