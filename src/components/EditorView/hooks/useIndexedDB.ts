const useIndexedDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("fileHandles", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("handles")) {
        request.result.createObjectStore("handles", {
          keyPath: "id",
        });
      }
      if (!db.objectStoreNames.contains("images")) {
        request.result.createObjectStore("images", {
          keyPath: "url",
        });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};
export default useIndexedDB;
