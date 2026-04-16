import { useState, useRef, useEffect } from "react";
import { Button, Modal, Space, Tree, Input, Splitter } from "antd";
import type { EditorView } from "@codemirror/view";
import { PictureOutlined } from "@ant-design/icons";
import useIndexedDB from "../../../../hooks/useIndexedDB";
import createFolderStore from "../../../../utils/folderStore";
import type { TreeNode } from "../../../../utils/buildDataTree";
import GenPDF from "../GenPDF/GenPDF";
import OpenSeadragonViewer from "./OpenSeadragonViewer";

import "./ImageFolder.css";

interface ImageFolderProps {
  codemirrorViewRef: React.RefObject<EditorView | null>;
}

const ImageFolder = ( props :  ImageFolderProps) => {
  const folderStore = createFolderStore(useIndexedDB());
  const [folderOpen, setFolderOpen] = useState<boolean>(false);
  const [folderSelected, setFolderSelected] = useState<TreeNode | null>(null);
  const [folderTree, setFolderTree] = useState<TreeNode[]>([]);
  const [nameModalOpen, setNameModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [nameInput, setNameInput] = useState<string>("");
  const [previewImageSrc, setPreviewImageSrc] = useState<string | Blob>("");

  useEffect(() => {
    if (folderSelected?.raw?.type === "image") {
      const url = folderSelected.raw.url;
      if (!url.startsWith("http") && !url.startsWith("https")) {
        folderStore.createLocalURLByImageURL(url).then((localURL) => {
          if (localURL) {
            setPreviewImageSrc(localURL);
          }
        });
      } else {
        setPreviewImageSrc(url);
      }
    } else {
      setPreviewImageSrc("");
    }
  }, [folderSelected]);

  const folderClicked = async (node: TreeNode) => {
    setFolderSelected(node);
  };

  const generateTreeData = async () => {
    const TreeData = await folderStore.queryAllFolders();
    setFolderTree(TreeData);
  };

  const openPicker = () => {
    fileInputRef.current!.value = "";
    fileInputRef.current!.click();
  };

  const openFolderPicker = () => {
    folderInputRef.current!.value = "";
    folderInputRef.current!.click();
  };

  return (
    <>
      <Space size={8} className="upload-image-actions">
        <Button
          icon={<PictureOutlined />}
          onClick={() => {
            setFolderOpen(true);
            generateTreeData();
          }}
        >
          图片文件夹
        </Button>
        <GenPDF viewRef={props.codemirrorViewRef} getImageUrl={async (url : string) => await folderStore.createLocalURLByImageURL(url)} />
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
                onSelect={async (_keys, event) => {
                  const selectedNode = event.selectedNodes[0] as TreeNode;
                  folderClicked(selectedNode);
                }}
              />
              <Button
                onClick={() => {
                  setNameInput("");
                  setNameModalOpen(true);
                }}
              >
                新建文件夹
              </Button>
              <Modal
                title="新建文件夹"
                open={nameModalOpen}
                onCancel={() => setNameModalOpen(false)}
                onOk={async () => {
                  await folderStore.createFolderByParentId(
                    folderSelected?.raw?.id || 1,
                    nameInput,
                  );
                  generateTreeData();
                  setNameModalOpen(false);
                }}
                width="30vw"
              >
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
              </Modal>
              <Button
                onClick={async () => {
                  if (folderSelected) {
                    await folderStore.deleteFileById(folderSelected.raw.id);
                    generateTreeData();
                  }
                }}
              >
                删除文件
              </Button>
              <Button
                onClick={async () => {
                  if (folderSelected) {
                    const currentName = String(folderSelected.title || "");
                    setNameInput(currentName);
                    setNameModalOpen(true);
                  }
                }}
              >
                更改文件夹命名
              </Button>
              <Button onClick={openPicker}>上传图片</Button>
              <Button onClick={openFolderPicker}>上传文件夹</Button>
            </div>
            <div>
              <div style={{ marginBottom: "8px", fontWeight: "bold" }}>图片预览</div>
              <div style={{ 
                height: "calc(90vh - 120px)", 
                border: "1px solid #d9d9d9", 
                borderRadius: "8px", 
                background: "#f5f5f5", 
                overflow: "hidden",
                display: "flex",
                flexDirection: "column"
              }}>
                {previewImageSrc ? (
                  <OpenSeadragonViewer src={previewImageSrc} />
                ) : (
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "center", 
                    alignItems: "center", 
                    height: "100%", 
                    color: "#999" 
                  }}>
                    请选择图片以预览
                  </div>
                )}
              </div>
            </div>
          </Splitter>
        </Modal>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!e.target.files || !fileInputRef.current || !folderSelected)
              return;
            console.log(e.target.files[0]);
            await folderStore.uploadImage(
              e.target.files[0],
              folderSelected.raw.id,
            );
            generateTreeData();
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          {...{ webkitdirectory: "true" }}
          multiple
          onChange={async (e) => {
            if (
              !e.target.files ||
              e.target.files.length === 0 ||
              !folderSelected
            )
              return;
            // 上传整个文件夹
            await folderStore.uploadFolderFromWebkitFileList(
              e.target.files,
              folderSelected.raw.id,
            );
            await generateTreeData();
            e.target.value = ""; // 清空
          }}
        />
      </Space>
    </>
  );
};

export default ImageFolder;
