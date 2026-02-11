import { useEffect, useRef, useState } from "react";

export function useFileSave() {
  const [isOpenedFile, setIsOpenedFile] = useState<boolean>(false);
  const filehandle = useRef<FileSystemFileHandle | null>(null);

  // Removed invalid assignment: FileSystemFileHandle cannot be restored from localStorage
  const newFile = () => {
    filehandle.current = null;
    setIsOpenedFile(false);
  }

  const openFile = async () => {
    const [fileHandle] = await window.showOpenFilePicker();
    filehandle.current = fileHandle;
    const file = await fileHandle.getFile();
    const fileName = file.name
    const contents = await file.text();
    setIsOpenedFile(true);
    return {  contents, fileName };
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
    filehandle.current = await window.showSaveFilePicker(options);
    writeFile(content);
    setIsOpenedFile(true);
    const fileName = (await filehandle.current.getFile()).name;
    console.log(filehandle.current);
    return { fileName };
  };

  const saveFile = async (content: string) => {
    writeFile(content);
    if (filehandle.current) {
      const fileName = (await filehandle.current.getFile()).name;
      return { fileName };
    }
    return { fileName: null };
  };

  const writeFile = async (content: string) => {
    if (!filehandle.current) return;
    const writable = await filehandle.current.createWritable();
    await writable.write(content);
    await writable.close();
  };

  return {
    newFile,
    openFile,
    saveFileAs,
    saveFile,
    isOpenedFile
  };
}
