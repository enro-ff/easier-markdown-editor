import { useRef, useState } from "react";

export function useFileSave() {
  const [isOpenedFile, setIsOpenedFile] = useState<boolean>(false);
  const filehandle = useRef<FileSystemFileHandle | null>(null);

  const newFile = () => {
    filehandle.current = null;
    setIsOpenedFile(false);
    // debugger;
  }

  const openFile = async () => {
    const [fileHandle] = await window.showOpenFilePicker();
    filehandle.current = fileHandle;
    const file = await fileHandle.getFile();
    const contents = await file.text();
    setIsOpenedFile(true);
    return contents;
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

  return {
    newFile,
    openFile,
    saveFileAs,
    saveFile,
    isOpenedFile
  };
}
