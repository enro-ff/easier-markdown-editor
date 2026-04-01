import type { RefObject } from "react";
import { useState, useRef } from "react";
import { EditorView } from "@codemirror/view";
import { Button, Space } from "antd";
import { UploadOutlined, PictureOutlined } from "@ant-design/icons";
import  useIndexedDB  from "../../../../hooks/useIndexedDB";
import createFolderStore from "../../../../utils/folderStore";


interface UploadImageItemProps {
    codeEditorViewRef: RefObject<EditorView | null>;
    codeContainerRef: RefObject<HTMLDivElement | null>;
    previewContainerRef: RefObject<HTMLDivElement | null>;
    dbPromise: Promise<IDBDatabase>;
}

const ImageFolder = () => {
    const folderStore = createFolderStore(useIndexedDB());
    const [uploading, setUploading] = useState(false);
    const [folderOpen, setFolderOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    return (
        <>
            <Space size={8} className="upload-image-actions">
                {/* <Button icon={<UploadOutlined />} loading={uploading} onClick={openPicker}>
                    上传图片
                </Button> */}
                <Button icon={<PictureOutlined />} onClick={async() => {
                    setFolderOpen(true)
                    console.log(folderStore)
                    console.log(await folderStore.queryFolderMeta('./'))
                }
                }>
                    图片文件夹
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="upload-image-input"

                />
            </Space >
        </>
    );
};

export default ImageFolder;
