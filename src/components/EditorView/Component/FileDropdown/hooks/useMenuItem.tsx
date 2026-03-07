import React, { useState, useMemo, type Dispatch, type RefObject } from "react";
import { useFileSave } from "../../../hooks/useFileSave";

export function useMenuItem(
  setInitialContent: Dispatch<React.SetStateAction<string>>,
  contentRef: RefObject<string>,
  DBPromise : Promise<IDBDatabase>
) {
  const {
    fileName,
    setFileName,
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    isPermitted,
    getPerimisson,
  } = useFileSave(setInitialContent, DBPromise);

  const [isSaved, setIsSaved] = useState<boolean>(true);
  const supportSystemFileAccess = "showOpenFilePicker" in window;

  const menuItems = useMemo(() => {
    if (supportSystemFileAccess) {
      return {
        items: [
          {
            key: "1",
            label: (
              <a
                onClick={async () => {
                  newFile();
                  setIsSaved(true);
                }}
              >
                new
              </a>
            ),
          },
          {
            key: "2",
            label: (
              <a
                onClick={async () => {
                  openFile();
                  setIsSaved(true);
                }}
              >
                open
              </a>
            ),
          },
          {
            key: "3",
            label: (
              <a
                onClick={async () => {
                  // Access ref in handler
                  await saveFile(contentRef.current!);
                  setIsSaved(true);
                }}
              >
                Save
              </a>
            ),
            disabled: !isPermitted,
          },
          {
            key: "4",
            label: (
              <a
                onClick={async () => {
                  // Access ref in handler
                  await saveFileAs(contentRef.current!);
                  setIsSaved(true);
                }}
              >
                Save As
              </a>
            ),
          },
        ],
      };
    } else {
      return {
        items: [
          {
            key: "1",
            label: (
              <a
                onClick={() => {
                  setInitialContent("");
                  setFileName("untitled.md");
                  localStorage.setItem("content", "");
                  localStorage.setItem("filename", "untitled.md");
                  setIsSaved(true);
                }}
              >
                new
              </a>
            ),
          },
          {
            key: "2",
            label: (
              <a
                onClick={async () => {
                  await new Promise((resolve) => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".md,text/plain";
                    input.onchange = async () => {
                      const file = input.files?.[0];
                      if (!file) {
                        resolve(null);
                        return;
                      }
                      const contents = await file.text();
                      setFileName(file.name);
                      setInitialContent(contents);
                      localStorage.setItem("content", contents);
                      localStorage.setItem("filename", file.name);
                      setIsSaved(true);
                      resolve(null);
                    };
                    input.click();
                  });
                }}
              >
                open
              </a>
            ),
          },
          {
            key: "3",
            label: (
              <a
                onClick={async () => {
                  // Access ref in handler
                  const content = contentRef.current;
                  const blob = new Blob([content ?? ""], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  setIsSaved(true);
                }}
              >
                SaveAs
              </a>
            ),
          },
        ],
      };
    }
  }, [
    supportSystemFileAccess,
    isPermitted,
    fileName,
    setFileName,
    setInitialContent,
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    contentRef,
  ]);

  return {
    menuItems,
    fileName,
    setFileName,
    isSaved,
    setIsSaved,
    isPermitted,
    getPerimisson,
    supportSystemFileAccess,
  };
}
