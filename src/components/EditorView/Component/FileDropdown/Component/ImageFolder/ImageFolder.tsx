import type { RefObject } from "react";
import { useState, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { Button, Modal, Space } from "antd";
import { UploadOutlined, PictureOutlined } from "@ant-design/icons";
import useIndexedDB from "../../../../hooks/useIndexedDB";
import createFolderStore from "../../../../utils/folderStore";
import type { StoredFolderMeta } from "../../../../utils/folderStore";

import "./ImageFolder.css";

const initFolderList = [
    {
      id: 1,
      name: "root",
      type: "folder",
      parentId: 0,
      url: "./",
    },
    {
      id: 2,
      name: "other",
      type: "folder",
      parentId: 0,
      url: "../",
    }
]


interface UploadImageItemProps {
    codeEditorViewRef: RefObject<EditorView | null>;
    codeContainerRef: RefObject<HTMLDivElement | null>;
    previewContainerRef: RefObject<HTMLDivElement | null>;
    dbPromise: Promise<IDBDatabase>;
}

const ImageFolder = () => {
    const folderStore = createFolderStore(useIndexedDB());
    const [folderOpen, setFolderOpen] = useState<boolean>(false);
    const [folderSelected, setFolderSelected] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const folderClicked = (folder: StoredFolderMeta) => {
        setFolderSelected(folder.url);
    }

    function generateFolderList(folders: StoredFolderMeta[]) {
        
        return folders.map((folder) => (
            <div key={folder.id} onClick={() => folderClicked(folder)} className={`image-folder-item ${folderSelected === folder.url ? "selected" : ""}`}>
                {folder.name}
            </div>
        ));
    }
    return (
        <>
            <Space size={8} className="upload-image-actions">
                {/* <Button icon={<UploadOutlined />} loading={uploading} onClick={openPicker}>
                    上传图片
                </Button> */}
                <Button icon={<PictureOutlined />} onClick={() => {
                    setFolderOpen(true)
                }
                }>
                    图片文件夹
                </Button>
                <Modal
                    title="图片文件夹"
                    open={folderOpen}
                    onCancel={() => setFolderOpen(false)}
                    className="image-folder-modal"
                    footer={null}
                    width="90vw"
                ><div>
                    {generateFolderList(initFolderList)}
                </div>
                </Modal>
                {/* <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="upload-image-input"

                /> */}
            </Space >
        </>
    );
};

export default ImageFolder;
