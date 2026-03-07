import React, {
  useImperativeHandle,
  useEffect,
  type Dispatch,
  type RefObject,
} from "react";
import { DownOutlined } from "@ant-design/icons";
import { Dropdown, Space } from "antd";
import { useMenuItem } from "./hooks/useMenuItem";
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
    menuItems,
    fileName,
    setFileName,
    isSaved,
    setIsSaved,
    isPermitted,
    getPerimisson,
    supportSystemFileAccess,
  } = useMenuItem(setInitialContent, contentRef);

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
        localStorage.setItem("content", contentRef.current!);
      }
    }, 1000); // Added 1000ms interval as it was missing or implied
    if (!supportSystemFileAccess) {
      const filename = localStorage.getItem("filename");
      if (filename) {
        setFileName(filename);
      }
    }
    return () => {
      clearInterval(timer);
    };
  });

  return (
    <>
      <Dropdown menu={menuItems}>
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
        {isPermitted && supportSystemFileAccess ? (
          ""
        ) : (
          <button onClick={getPerimisson}>授权</button>
        )}
      </p>
    </>
  );
};

export default FileDropDown;
