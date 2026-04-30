import { ImagefolderStore } from "./ImagefolderStore";

let instance: ImagefolderStore | null = null;
let creatingInstance = false;

export const createImagefolderStore = (
  dbPromise: Promise<IDBDatabase>,
): ImagefolderStore => {
  // 双重检查锁定模式，防止并发创建多个实例
  if (!instance) {
    if (!creatingInstance) {
      creatingInstance = true;
      instance = new ImagefolderStore(dbPromise);
    }
  }
  return instance!;
};

export default createImagefolderStore;
