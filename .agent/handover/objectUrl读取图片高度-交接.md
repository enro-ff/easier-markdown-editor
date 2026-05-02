## 实现

- 在 `folderStore/objectUrl.ts` 新增 `getImageHeightFromIndexedDB(db, imageUrl)`：只读事务查询 `folders` 的 `url` 索引，取 `type === "image"` 的元数据，返回 `height`（无记录或未写入尺寸则为 `undefined`）。

## 决策

- 高度来自上传时写入的 `StoredImageMeta.height`，不拼接分片再解码图片，避免 IO 与解码成本。

## 注意

- 旧数据或解码失败时元数据可能没有 `height`，调用方需处理 `undefined`。
