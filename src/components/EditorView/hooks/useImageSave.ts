import { useState } from "react";

interface ImageInfo {
  url: string;
  blob: Blob | null;
}

const useImageSave = (DBPromise: Promise<IDBDatabase>) => {
  const [images, setImages] = useState<ImageInfo[]>([]);

  const webURL = ["http://", "https://"]

  // 1. 获得image的url并且存入indexeddb，但是已经有的blob不重置
  const updateImageList = async (content: string) => {
    const db = await DBPromise;
    const imageURLRegex = /!\[.*?\]\((.*?)\)/g;
    const urls = content.match(imageURLRegex);
    const store = db.transaction("images", "readwrite").objectStore("images");

    urls?.forEach((url) => {
      const request = store.get(url);
      request.onsuccess = () => {
        if (!request.result) {
          store.add({
            url,
            blob: null,
          });
        }
      };
    });
  };

  //根据本地url设置blob
  const getImageBlob = (url: string) => {
    const input = document.createElement('input')
    input.type = "image"
    input.onchange = async() => {
      const file = input.files;
      if(file)
    }
    
  }

  

  return {
    updateImageList,
    images
  }
};
export default useImageSave;
