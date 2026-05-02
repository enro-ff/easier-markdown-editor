import { request2Promise } from "./idb";
import type { StoredImageMeta, StoredMetaBase } from "./types";

export type ObjectUrlValue = string | Blob | undefined;

/** 从 IndexedDB `folders` 中按图片 url 读取已缓存的 height（上传时写入，可能为 undefined）和 width。 */
export async function getImageHeightFromIndexedDB(
  db: IDBDatabase,
  imageUrl: string,
): Promise<[number | undefined, number | undefined]> {
  const store = db.transaction(["folders"], "readonly").objectStore("folders");
  const files = (await request2Promise(
    store.index("url").getAll(imageUrl),
  )) as StoredMetaBase[];

  const imageMeta = files.find((a) => a.type === "image") as
    | StoredImageMeta
    | undefined;

  return [imageMeta?.height, imageMeta?.width];
}

export class ObjectUrlStore {
  private urlMap: Map<string, string> = new Map();
  private maxImageCount = 50;

  get(key: string): ObjectUrlValue {
    return this.urlMap.get(key);
  }

  setFromBlob(key: string, blob: Blob): string {
    if (this.urlMap.size >= this.maxImageCount) {//删除最先进入map的图片
      const [firstKey] = this.urlMap.keys();
      this.release(firstKey);
      this.urlMap.delete(firstKey);
    }
    const objectUrl = URL.createObjectURL(blob) || "";
    this.urlMap.set(key, objectUrl);
    return objectUrl;
  }

  release(key: string) {
    const objectUrl = this.urlMap.get(key) || "";
    if (objectUrl === "") return;
    URL.revokeObjectURL(objectUrl);
    this.urlMap.delete(key);
  }
}
