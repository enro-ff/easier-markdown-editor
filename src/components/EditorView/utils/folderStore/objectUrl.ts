export type ObjectUrlValue = string | Blob | undefined;

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
