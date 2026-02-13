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
  };

  const checkPermission = async (handle: FileSystemFileHandle) => {
    const query = await handle.queryPermission({});
    setIsPermitted(query === "granted");
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
        .getAll();
      objStoreRequest.onsuccess = () => {
        console.log(objStoreRequest.result);
        if (objStoreRequest.result.length > 0) {
          const handle = objStoreRequest.result[0].handle;
          filehandle.current = handle;
          checkPermission(handle);
          readFileHandle(handle);
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
    const writable = await filehandle.current.createWritable();
    await writable.write(content);
    await writable.close();
  };

  const getPerimisson = async () => {
    await filehandle.current?.requestPermission({});
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
