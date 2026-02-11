import React, { type Dispatch, type RefObject } from "react";
import { DownOutlined } from "@ant-design/icons";
import { Dropdown, Space } from "antd";
import { useFileSave } from "../../hooks/useFileSave";

interface FileDropDownProps {
  contentRef: RefObject<string>;
  setInitialContent: Dispatch<React.SetStateAction<string>>;
}
const FileDropDown: React.FC<FileDropDownProps> = ({
  contentRef,
  setInitialContent,
}) => {
  const { newFile, openFile, saveFile, saveFileAs, isOpenedFile } =
    useFileSave();
  return (
    <Dropdown
      menu={{
        items: [
          {
            key: "1",
            label: (
              <a
                onClick={async() => {
                  newFile();
                  setInitialContent("");
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
                onClick={async() => {
                  const contents = await openFile();
                  setInitialContent(contents);
                }}
              >
                open
              </a>
            ),
          },
          {
            key: "3",
            label: <a onClick={async() => saveFile(contentRef.current)}>Save</a>,
            disabled: !isOpenedFile,
          },
          {
            key: "4",
            label: (
              <a onClick={async() => saveFileAs(contentRef.current)}>Save As</a>
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
  );
};

export default FileDropDown;
