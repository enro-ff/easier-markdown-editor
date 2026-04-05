import type { RefObject } from "react";
import { useState, useRef, useCallback } from "react";
import { EditorView } from "@codemirror/view";
import { Button, Modal, Space, Tree, Input } from "antd";
import { UploadOutlined, PictureOutlined } from "@ant-design/icons";
import useIndexedDB from "../../../../hooks/useIndexedDB";
import createFolderStore from "../../../../utils/folderStore";
import type { TreeNode } from "../../../../utils/buildDataTree";

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
    const [folderSelected, setFolderSelected] = useState<number>(0);
    const [folderTree, setFolderTree] = useState<TreeNode[]>([]);
    const [nameModalOpen, setNameModalOpen] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [nameInput, setNameInput] = useState<string>("");

    const folderClicked = async (id: number) => {
        setFolderSelected(id);
    }

    const generateTreeData = async () => {
        const TreeData = await folderStore.queryAllFolders()
        setFolderTree(TreeData)
    }

    const openPicker = () => {
        fileInputRef.current!.value = '';
        fileInputRef.current!.click();
    }

    return (
        <>
            <Space size={8} className="upload-image-actions">
                {/* <Button icon={<UploadOutlined />} loading={uploading} onClick={openPicker}>
                    上传图片
                </Button> */}
                <Button icon={<PictureOutlined />} onClick={() => {
                    setFolderOpen(true)
                    generateTreeData()
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
                ><Tree
                        treeData={folderTree}
                        onSelect={async (keys) => folderClicked(Number(keys[0]))}
                    />
                    <Button onClick={() => {
                        setNameInput("")
                        setNameModalOpen(true)
                    }}>新建文件夹</Button>
                    <Modal
                        title="新建文件夹"
                        open={nameModalOpen}
                        onCancel={() => setNameModalOpen(false)}
                        onOk={async () => {
                            await folderStore.createFolderByParentId(folderSelected, nameInput)
                            generateTreeData()
                            setNameModalOpen(false)
                        }}
                        width="30vw"
                    >
                        <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
                    </Modal>
                    <Button onClick={async () => {
                        await folderStore.deleteFileById(folderSelected)
                        generateTreeData()
                    }}>删除文件</Button>
                    <Button onClick={async () => {
                        const currentName = String(folderTree.filter(item => item.key === folderSelected)[0].title || "")
                        setNameInput(currentName)
                        console.log(currentName)
                        setNameModalOpen(true)
                    }}>更改文件夹命名</Button>
                    <Button onClick={openPicker}>上传图片</Button>
                </Modal>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    // multiple
                    onChange={async(e : React.ChangeEvent<HTMLInputElement>) => {
                        if(!e.target.files || !fileInputRef.current)return;
                        console.log(e)
                        await folderStore.uploadImage(e.target.files[0], folderSelected);
                        generateTreeData();
                    }

                    }
                />
            </Space >
        </>
    );
};

export default ImageFolder;
