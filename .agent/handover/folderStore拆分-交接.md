## 实现方案
- 将 `src/components/EditorView/utils/folderStore.ts` 拆为目录模块 `src/components/EditorView/utils/folderStore/`：`types.ts` / `constants.ts` / `idb.ts` / `image.ts` / `hash.ts` / `ImagefolderStore.ts` / `factory.ts` / `index.ts`。
- 保留原入口 `src/components/EditorView/utils/folderStore.ts` 作为**薄转发层**，对外 API（默认导出 factory + `ImagefolderStore` + 各类型）保持不变。

## 关键决策
- **避免同名解析陷阱**：薄转发层显式 re-export `./folderStore/index`，避免 `./folderStore` 被解析回同名文件导致循环别名。
- **单向依赖**：工具层（hash/image/idb/types/constants）不依赖 store；`ImagefolderStore` 只向下依赖工具层。
- **严格 TS**：补齐若干 `implicit any` 与 `any/@ts-ignore` 以满足当前 ESLint 规则（不改业务行为）。

## 注意事项
- `createLocalURLByImageURL` 的返回值可能是 `string | Blob | undefined`（来自 `Map.get`），调用侧已按此处理。
- `npm run lint` 仍有少量 `react-hooks/exhaustive-deps` warning 属历史问题，本次未强改依赖数组以避免行为变化。
