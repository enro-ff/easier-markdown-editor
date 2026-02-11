import React, {
  useImperativeHandle,
  useState,
  type Dispatch,
  type RefObject,
} from "react";
import { DownOutlined } from "@ant-design/icons";
import { Dropdown, Space } from "antd";
import { useFileSave } from "../../hooks/useFileSave";
import "./FileDropdown.css";

interface FileDropDownProps {
  ref: React.Ref<{updateIsSaved: () => void}>;
  contentRef: RefObject<string>;
  setInitialContent: Dispatch<React.SetStateAction<string>>;
}
const FileDropDown: React.FC<FileDropDownProps> = ({
  ref,
  contentRef,
  setInitialContent,
}) => {
  const { newFile, openFile, saveFile, saveFileAs, isOpenedFile } =
    useFileSave();

  const [Filename, setFilename] = useState<string>("无标题.md");
  const [isSaved, setIsSaved] = useState<boolean>(true);

  useImperativeHandle(ref, () => {
    return {
      updateIsSaved() {
        if (isSaved) {
          setIsSaved(false);
        }
      },
    };
  });

  return (
    <>
      <Dropdown
        menu={{
          items: [
            {
              key: "1",
              label: (
                <a
                  onClick={async () => {
                    newFile();
                    setInitialContent("");
                    setFilename("无标题.md");
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
                    const { contents, fileName } = await openFile();
                    setInitialContent(contents);
                    setFilename(fileName);
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
                    const { fileName } = await saveFile(contentRef.current);
                    if (fileName) setFilename(fileName);
                  }}
                >
                  Save
                </a>
              ),
              disabled: !isOpenedFile,
            },
            {
              key: "4",
              label: (
                <a
                  onClick={async () => {
                    const { fileName } = await saveFileAs(contentRef.current);
                    if (fileName) setFilename(fileName);
                  }}
                >
                  Save As
                </a>
              ),
            },
          ],
        }}
      >
        <a onClick={(e) => e.preventDefault()}>
          <Space>
            File
            <DownOutlined />
          </Space>
        </a>
      </Dropdown>
      <p className="filename">{Filename}{isSaved ? "" : "*(unsaved)"}</p>
    </>
  );
};

export default FileDropDown;
