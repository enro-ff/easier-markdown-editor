
class ImagefolderStore {
  private db!: IDBDatabase;
  private idx : number = 0;

  //创建文件id
  private createFileId() {
    return Date.now() * 1000 + this.idx++;
  }

  //格式化url，用。/或。。/开头
  private formatUrl(url: string) {
    const urlArr = url.split("/");
    if(urlArr[0] !== "." && urlArr[0] !== ".."){
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

  //查询文件夹id，可用来查询父文件夹id
  async queryFolderMeta(folderUrl: string) {
    const store = this.db.transaction(["folders"], "readonly").objectStore("folders");
    const result : StoredFolderMeta | undefined = await store.index("url").get(this.formatUrl(folderUrl));
    return result || null;
  }

  //创建文件夹，如果不存在父文件夹则递归创建
  async createFolder(folderUrl: string, name: string) {
    const store = this.db.transaction(["folders"], "readwrite").objectStore("folders");
    let parentMeta  = await this.queryFolderMeta(await this.queryParentFolderUrl(folderUrl));
    if(!parentMeta){
      parentMeta = await this.createFolder(await this.queryParentFolderUrl(folderUrl), name);
    }
    const folderMeta: StoredFolderMeta = {
      type: "folder",
      id: this.createFileId(),
      name,
      parentId: parentMeta?.id || 1,
      url: this.formatUrl(folderUrl),
    };
    await store.add(folderMeta);
    return folderMeta;
  }

  //获取文件夹下所有子文件夹
  private async querySubFolders(folderUrl: string) {
    if(folderUrl === "/"){
      // 根目录
      const RootResult = this.db.transaction(["folders"], "readonly").objectStore("folders").index("parentId").getAll(0);
      if(RootResult){
        return [RootResult];
      }else{
        return [];
      }
    }
   const store = this.db.transaction(["folders"], "readonly").objectStore("folders");
   const parentId = await this.queryFolderMeta(await this.queryParentFolderUrl(folderUrl))?.id || 1;
   const result : StoredFolderMeta[] | undefined = await store.index("parentId").getAll(parentId);
   return result || [];
  }
}
export default (dbPromise: Promise<IDBDatabase>) => {
  return new ImagefolderStore(dbPromise);
}

export interface StoredMetaBase {
  id: number;
  name: string;
  parentId: number;
  // 若文件夹确实需要 url（例如表示路径），则保留；否则可以移除或设为可选
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