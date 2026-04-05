import type { RefObject } from "react";
import { useState, useRef, useEffect } from "react";
import { EditorView } from "@codemirror/view";
import { Button, Modal, Space, Tree, Input, Splitter } from "antd";
import { UploadOutlined, PictureOutlined } from "@ant-design/icons";
import useIndexedDB from "../../../../hooks/useIndexedDB";
import createFolderStore from "../../../../utils/folderStore";
import type { TreeNode } from "../../../../utils/buildDataTree";
import ImagePreview from "../ImagePreview/ImagePreview";

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
    const [folderSelected, setFolderSelected] = useState<TreeNode | null>(null);
    const [folderTree, setFolderTree] = useState<TreeNode[]>([]);
    const [nameModalOpen, setNameModalOpen] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [nameInput, setNameInput] = useState<string>("");
    const [previewImageSrc, setPreviewImageSrc] = useState<string>("");

    useEffect(() => {
        if (folderSelected?.raw?.type === 'image') {
            const url = folderSelected.raw.url;
            if(!url.startsWith('http') && !url.startsWith('https')){
                 folderStore.createLocalURLByImageURL(url).then((localURL) => {
                    setPreviewImageSrc(localURL || "");
                 });
            }
            else{
                setPreviewImageSrc(url);
            }
        } else {
            setPreviewImageSrc("");
        }
    }, [folderSelected]);



    const folderClicked = async (node: TreeNode) => {
        setFolderSelected(node);
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
                >
                    <Splitter className="split-folder-tree">
                        <div>
                            <Tree
                                treeData={folderTree}
                                onSelect={async (keys, event) => {
                                    const selectedNode = event.selectedNodes[0] as TreeNode;
                                    folderClicked(selectedNode);
                                }}
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
                                    await folderStore.createFolderByParentId(folderSelected?.raw?.id || 1, nameInput)
                                    generateTreeData()
                                    setNameModalOpen(false)
                                }}
                                width="30vw"
                            >
                                <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
                            </Modal>
                            <Button onClick={async () => {
                                if (folderSelected) {
                                    await folderStore.deleteFileById(folderSelected.raw.id)
                                    generateTreeData()
                                }
                            }}>删除文件</Button>
                            <Button onClick={async () => {
                                if (folderSelected) {
                                    const currentName = String(folderSelected.title || "")
                                    setNameInput(currentName)
                                    console.log(currentName)
                                    setNameModalOpen(true)
                                }
                            }}>更改文件夹命名</Button>
                            <Button onClick={openPicker}>上传图片</Button>
                        </div>
                        <div>
                            <div>图片预览</div>
                             {previewImageSrc && <img src = {previewImageSrc}/>}
                            
                        </div>
                    </Splitter>
                </Modal>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    // multiple
                    onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                        if (!e.target.files || !fileInputRef.current || !folderSelected) return;
                        console.log(e)
                        await folderStore.uploadImage(e.target.files[0], folderSelected.raw.id);
                        generateTreeData();
                    }

                    }
                />
            </Space >
        </>
    );
};

export default ImageFolder;
