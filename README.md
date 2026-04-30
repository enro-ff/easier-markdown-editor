# Easier Markdown Editor

一款**纯前端**的沉浸式 Markdown 编辑器：支持在浏览器中**直接管理本地 `.md` 文件**，并集成 **AI 驱动的打印主题（CSS）生成**与 **A4 PDF 导出**。

- **Tech Stack**: React 19, TypeScript, CodeMirror 6, IndexedDB, Web-LLM, Ant Design
- **场景**: 本地笔记/技术文档写作、离线资料整理、A4 打印排版

## Demo

- 在线体验：TODO
- 演示视频 / 截图：见下方

## Screenshots

> 建议放 3 张：主编辑器（双栏）、图片文件夹（离线预览）、PDF 预览（A4 + AI CSS）。

- TODO: `docs/screenshots/editor.png`
- TODO: `docs/screenshots/image-folder.png`
- TODO: `docs/screenshots/pdf-preview.png`

## Features

- **双栏编辑**：编辑区 / 预览区、双向同步滚动
- **本地文件**：新建 / 打开 / 保存 / 另存为（含兼容降级）
- **图片文件夹**：图片上传、文件夹上传、离线预览（Object URL）
- **大图查看**：OpenSeadragon 深度缩放与平移浏览
- **PDF 导出**：A4 预览、打印、AI 生成主题 CSS

## 项目亮点（适配简历）

- **核心编辑器与双栏状态同步（CodeMirror 6 + React）**  
  基于 CodeMirror 6 构建“编辑 / 预览”双栏界面；通过计算“目标侧当前滚动位置对应的行号 + 行内滚动比例”，再映射到另一侧的同一行块高度，实现**平滑、无跳动的双向同步滚动**（含锁与 RAF 解耦避免循环触发）。

- **文件系统交互（File System Access API）与优雅降级**  
  在支持 `showOpenFilePicker/showSaveFilePicker` 的浏览器中实现**本地文件直接读写**；并检测兼容性，在不支持的环境下自动降级为传统 `<input type="file">` 导入与 Blob 下载导出，保证功能可用性与用户体验一致。

- **纯前端图片图床（IndexedDB）与离线预览**  
  以 IndexedDB 设计并实现图片存储系统：  
  - **4MB 分块**写入 `chunks` store，解决大文件单次写入的性能/体积瓶颈  
  - 基于 SHA-256（失败回退到 djb2）做内容哈希校验，支持**断点续传**与“同名同目录并发上传”队列化  
  - 重组 Blob 后生成 **Object URL** 模拟本地路径，实现图片**离线渲染与预览**（超大文件返回 Blob 以避免内存爆炸）

- **A4 PDF 导出与样式优化（window.print + Web-LLM）**  
  将 CodeMirror Markdown 语法树解析为 HTML（支持链接/图片），注入 A4 打印样式并通过 `window.print()` 实现**纯前端无损导出 PDF**；同时引入 Web-LLM（浏览器端本地模型）支持用户用自然语言**动态生成 CSS 主题**并应用到打印/导出流程。

## Architecture (Brief)

- `EditorView`：双栏编辑器主视图（CodeMirror + 预览）
- `useEditorSyncScroll`：双向同步滚动策略（行号 + 行内比例映射）
- `useFileSave` + 菜单：File System Access API + 降级导入导出
- `useIndexedDB`：IndexedDB 连接与 store 初始化
- `folderStore`：图片/文件夹元数据 + 分块存储 + 断点续传 + Object URL
- `useMd2pdf`：Markdown AST → HTML → A4 打印（`window.print`）
- `aiGenCSS`：Web-LLM 本地模型生成打印 CSS

## Project Structure

```text
easier-markdown-editor/
├── public/
└── src/
    ├── components/
    │   └── EditorView/
    │       ├── Component/
    │       │   └── FileDropdown/
    │       │       ├── Component/
    │       │       │   ├── GenPDF/
    │       │       │   │   └── GenPDF.tsx              # PDF 预览/打印 + AI CSS
    │       │       │   └── ImageFolder/
    │       │       │       ├── ImageFolder.tsx         # 图片文件夹 UI（上传/预览）
    │       │       │       └── OpenSeadragonViewer.tsx # 大图深度缩放预览
    │       │       └── hooks/
    │       │           └── useMenuItem.tsx             # 文件菜单（含降级逻辑）
    │       ├── hooks/
    │       │   ├── useEditorSyncScroll.ts              # 双栏同步滚动
    │       │   ├── useFileSave.ts                      # 本地文件读写（FS Access）
    │       │   ├── useIndexedDB.ts                     # IndexedDB 初始化/连接
    │       │   └── useMd2pdf.tsx                       # Markdown → HTML → print
    │       ├── utils/
    │       │   ├── aiGenCSS.ts                         # Web-LLM 生成打印 CSS
    │       │   └── folderStore.ts                      # 图床：分块/续传/Object URL
    │       └── EditorView.tsx
    ├── App.tsx
    └── main.tsx
```

## 技术栈

- **React 19 + TypeScript**：组件化与类型安全
- **CodeMirror 6**：编辑器内核与扩展能力
- **IndexedDB**：本地持久化（文件句柄、图片元数据、分块数据）
- **Web-LLM（@mlc-ai/web-llm）**：浏览器端本地模型推理（CSS 生成）
- **Ant Design**：UI 组件与交互
- **OpenSeadragon**：大图深度缩放预览

## 本地运行

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run dev        # 启动开发服务器
npm run build      # 生产构建
npm run preview    # 预览生产构建
npm run lint       # ESLint
npm run test       # Playwright e2e
```

## 兼容性说明

- **File System Access API**：Chromium 系浏览器体验最佳；不支持时会自动降级为导入/导出模式。
- **IndexedDB**：主流现代浏览器支持（包含部分内核前缀兜底）。
- **Web-LLM**：首次使用需要加载模型与 wasm 资源；低性能设备可能耗时较长。

## Notes

- **本地文件权限**：使用 File System Access API 时，浏览器会基于站点权限控制读写；必要时需手动授予权限。
- **大文件图片**：重组 Blob 并生成 Object URL 可能产生较高内存占用；实现中对超大文件提供了 Blob 返回路径以降低风险。

## 测试

```bash
npm run test
```

## 许可证

MIT License，详见 [LICENSE](LICENSE)。
