## 实现方案
- 将 `ImagefolderStore.ts` 中图片上传/分片续传、本地 ObjectURL 生成/释放的实现迁移到 `utils/folderStore/image.ts`，新增 `ImageOps` 作为封装。
- `ImagefolderStore` 对外 API 不变：`uploadImage` / `createLocalURLByImageURL` / `releaseURL` 变为薄代理（delegate）到 `ImageOps`。

## 关键决策
- `urlMap` 与上传队列从 store 内移出，成为 `ImageOps` 的内部状态（`urlMap` 为实例级，上传队列为 static 跨实例）。
- `ImageOps` 通过 context 注入 store 的必要能力（`ensureReady/getDb/createFileId/...`），避免反向依赖和循环 import。

## 注意事项
- `createLocalURLByImageURL` 返回类型统一为 `string | Blob | undefined`（`Map.get` 可能为 `undefined`），调用侧已按该类型处理。
