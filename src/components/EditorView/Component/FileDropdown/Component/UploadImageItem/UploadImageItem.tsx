import React, { useEffect, useState } from "react";
import { Button, Card, Modal, Popconfirm, Space, Spin, Tooltip, Pagination, Typography } from "antd";
import { DeleteOutlined, PictureOutlined, UploadOutlined } from "@ant-design/icons";
import type { EditorView } from "@codemirror/view";
import { useImageAssets } from "../../../../hooks/useImageAssets";
import type { StoredImageMeta } from "../../../../utils/imageStore";
import "./UploadImageItem.css";

const { Text } = Typography;

interface UploadImageItemProps {
  codeEditorViewRef: React.MutableRefObject<EditorView | null>;
  codeContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  previewContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  dbPromise: Promise<IDBDatabase>;
}

const formatSize = (size: number) => {
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size > 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
};

const UploadImageItem: React.FC<UploadImageItemProps> = ({
  codeEditorViewRef,
  codeContainerRef,
  previewContainerRef,
  dbPromise,
}) => {
  const {
    store,
    images,
    total,
    page,
    pageSize,
    loading,
    uploading,
    managerOpen,
    setManagerOpen,
    refresh,
    openPicker,
    fileInputRef,
    onFileInputChange,
    removeImage,
    insertFromManager,
  } = useImageAssets({
    codeEditorViewRef,
    codeContainerRef,
    previewContainerRef,
    dbPromise,
  });

  const [previewMap, setPreviewMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!managerOpen) return;
    refresh(1);
  }, [managerOpen, refresh]);

  useEffect(() => {
    let cancelled = false;
    if (!managerOpen || !images.length) {
      setPreviewMap({});
      return () => undefined;
    }

    const load = async () => {
      const entries = await Promise.all(
        images.map(async (img) => [img.id, await store.getObjectURL(img.id)] as const),
      );
      if (!cancelled) {
        setPreviewMap(Object.fromEntries(entries));
      }
    };
    void load();
    return () => {
      cancelled = true;
      images.forEach((img) => store.revokeObjectURL(img.id));
    };
  }, [images, managerOpen, store]);

  const renderCard = (item: StoredImageMeta) => (
    <Card
      key={item.id}
      hoverable
      size="small"
      cover={
        <div className="asset-thumb">
          {previewMap[item.id] ? (
            <img src={previewMap[item.id]} alt={item.name} />
          ) : (
            <div className="asset-thumb__placeholder">Loading...</div>
          )}
        </div>
      }
      actions={[
        <Tooltip title="Insert into markdown" key="insert">
          <Button type="link" onClick={() => insertFromManager(item)}>
            Insert
          </Button>
        </Tooltip>,
        <Popconfirm
          key="delete"
          title="Delete image?"
          okText="Delete"
          cancelText="Cancel"
          onConfirm={() => removeImage(item.id)}
        >
          <DeleteOutlined />
        </Popconfirm>,
      ]}
    >
      <Card.Meta
        title={<Text ellipsis>{item.name}</Text>}
        description={`Size: ${formatSize(item.size)}${item.chunked ? " · chunked" : ""}`}
      />
    </Card>
  );

  return (
    <>
      <Space size={8} className="upload-image-actions">
        <Button icon={<UploadOutlined />} loading={uploading} onClick={openPicker}>
          Upload Image
        </Button>
        <Button icon={<PictureOutlined />} onClick={() => setManagerOpen(true)}>
          Asset Library
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="upload-image-input"
          onChange={onFileInputChange}
        />
      </Space>

      <Modal
        title="Image Library (IndexedDB)"
        open={managerOpen}
        onCancel={() => setManagerOpen(false)}
        footer={null}
        width={920}
      >
        <Spin spinning={loading} tip="Loading images...">
          {images.length === 0 ? (
            <div className="asset-empty">No images stored yet.</div>
          ) : (
            <div className="asset-grid">
              {images.map((item) => renderCard(item))}
            </div>
          )}
        </Spin>
        <Pagination
          className="asset-pagination"
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger
          onChange={(p, size) => refresh(p, size)}
        />
        <Button  onClick={() =>{ store.deleteAllImage();refresh(1)}}>
          删除所有图片
        </Button>
      </Modal>
    </>
  );
};

export default UploadImageItem;
