import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";

export function useFileSave(
  setInitialContent: Dispatch<React.SetStateAction<string>>,
) {
  const [isPermitted, setIsPermitted] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>("");
  const filehandle = useRef<FileSystemFileHandle | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);

  const readFileHandle = async (handle: FileSystemFileHandle) => {
    //从filehandle里读取文件内容
    const contents = await (await handle.getFile()).text();
    setFileName(handle.name);
    setInitialContent(contents);
    const localContent = localStorage.getItem("content");
    if(localContent !== contents) {
      localStorage.setItem("content", contents);
    }
  };

  const checkPermission = async (handle: FileSystemFileHandle) => {
    const query = await handle.queryPermission({});
    const permission = query === "granted";
    setIsPermitted(permission);
    console.log(isPermitted);
  };

  const storeFileHandleChange = (handle: FileSystemFileHandle | null) => {
    //把filehandle的变更存储到indexedDB里
    filehandle.current = handle;
    dbRef.current
      ?.transaction("handles", "readwrite")
      .objectStore("handles")
      .put({ id: "111", handle: handle });
    if (handle) setFileName(handle.name);
  };

  useEffect(() => {
    const request = indexedDB.open("fileHandles", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("handles", {
        keyPath: "id",
      });
    };
    //从indexedDB里读取filehandle
    request.onsuccess = () => {
      dbRef.current = request.result;
      const objStoreRequest = request.result
        .transaction("handles")
        .objectStore("handles")
        .get("111");
      objStoreRequest.onsuccess = () => {
        console.log(objStoreRequest.result);
        if (objStoreRequest.result && objStoreRequest.result.handle) {
          const handle = objStoreRequest.result.handle;
          filehandle.current = handle;
          checkPermission(handle);
          const content = localStorage.getItem("content")
          setFileName(handle.name);
          if(content) {
            setInitialContent(content);
          }
        }
      };
    };
  }, []);

  const newFile = () => {
    storeFileHandleChange(null);
    setFileName("");
    setInitialContent("");
    setIsPermitted(false);
  };

  const openFile = async () => {
    const [fileHandle] = await window.showOpenFilePicker();
    checkPermission(fileHandle);
    storeFileHandleChange(fileHandle);
    readFileHandle(fileHandle);
  };

  const saveFileAs = async (content: string) => {
    const options: SaveFilePickerOptions = {
      types: [
        {
          description: "markdown Files",
          accept: { "text/plain": [".md" as `.${string}`] },
        },
      ],
    };

    const handle = await window.showSaveFilePicker(options);
    storeFileHandleChange(handle);
    readFileHandle(handle);
    writeFile(content);
    setIsPermitted(true);
  };

  const saveFile = async (content: string) => {
    writeFile(content);
  };

  const writeFile = async (content: string) => {
    if (!filehandle.current) return;
    localStorage.setItem("content", content);
    const writable = await filehandle.current.createWritable();
    await writable.write(content);
    await writable.close();
  };

  const getPerimisson = async () => {
    await filehandle.current?.requestPermission({});
    setIsPermitted(true);
  };
  return {
    fileName,
    newFile,
    openFile,
    saveFileAs,
    saveFile,
    isPermitted,
    getPerimisson,
  };
}
