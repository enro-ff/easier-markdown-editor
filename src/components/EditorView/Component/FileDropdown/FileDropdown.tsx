import React, {
  useImperativeHandle,
  useState,
  useEffect,
  type Dispatch,
  type RefObject,
} from "react";
import { DownOutlined } from "@ant-design/icons";
import { Dropdown, Space } from "antd";
import { useFileSave } from "../../hooks/useFileSave";
import "./FileDropdown.css";

interface FileDropDownProps {
  ref: React.Ref<{ updateIsSaved: () => void }>;
  contentRef: RefObject<string>;
  setInitialContent: Dispatch<React.SetStateAction<string>>;
}
const FileDropDown: React.FC<FileDropDownProps> = ({
  ref,
  contentRef,
  setInitialContent,
}) => {
  const {
    fileName,
    setFileName,
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    isPermitted,
    getPerimisson,
  } = useFileSave(setInitialContent);

  const [isSaved, setIsSaved] = useState<boolean>(true);
  const supportSystemFileAccess = "showOpenFilePicker" in window;

  useImperativeHandle(ref, () => {
    return {
      updateIsSaved() {
        if (isSaved) {
          setIsSaved(false);
        }
      },
    };
  });

  useEffect(() => {
    //定时保存当前内容到localStorage里，防止用户误操作导致内容丢失
    const timer = setInterval(() => {
      if (!isSaved) {
        localStorage.setItem("content", contentRef.current);
      }
    });
    if(!supportSystemFileAccess) {
      const filename =localStorage.getItem("filename")
      if (filename) {
        setFileName(filename)
      }
    }
    return () => {
      clearInterval(timer);
    };
  });

  // Avoid accessing ref.current during render
  const menuItems = React.useMemo(() => {
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
                  await saveFile(contentRef.current);
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
                  await saveFileAs(contentRef.current);
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
  }, [supportSystemFileAccess, isPermitted, fileName, setFileName, setInitialContent, setIsSaved, newFile, openFile, saveFile, saveFileAs, contentRef]);
  return (
    <>
      <Dropdown
        menu={menuItems}
      >
        <a onClick={(e) => e.preventDefault()}>
          <Space>
            File
            <DownOutlined />
          </Space>
        </a>
      </Dropdown>
      <p className="filename">
        {fileName}
        {isSaved ? "" : "*(unsaved)"}
        {(isPermitted && supportSystemFileAccess )?<button onClick={getPerimisson}>授权</button> : ""}
      </p>
    </>
  );
};

export default FileDropDown;
