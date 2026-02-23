const openDB = () => {
  const request = indexedDB.open("fileHandles", 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore("handles", {
      keyPath: "id",
    });
    request.result.createObjectStore("images", {
      keyPath: "localurl",
    });
  };
  return request;
};

export { openDB };
