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
  const { fileName, newFile, openFile, saveFile, saveFileAs, isPermitted, getPerimisson } =
    useFileSave(setInitialContent);

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
     <button onClick = {getPerimisson}>授权</button>
      <Dropdown
        menu={{
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
                    openFile()
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
                    await saveFileAs(contentRef.current);
                    setIsSaved(true);
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
      <p className="filename">{fileName}{isSaved ? "" : "*(unsaved)"}</p>
    </>
  );
};

export default FileDropDown;
