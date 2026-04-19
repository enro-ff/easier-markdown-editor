# Easier Markdown Editor

## 项目介绍

Easier Markdown Editor 是一个使用 Vite + React + TypeScript 构建的简易 Markdown 编辑器，致力于提供简单直观的 Markdown 编写体验。

## 功能特性

### 核心功能

- **双面板编辑模式**：提供所见即所得的预览模式与纯粹的代码编辑面板
- **丰富的 Markdown 支持**：
  - 六级标题
  - 斜体 (*斜体*)
  - 加粗 (**加粗**)
  - 删除线 (~~删除线~~)
  - 超链接 ([链接文本](URL))
  - 图片 (!\[图片描述]\(图片URL null))
  - 代码块
- **文件管理**：支持创建、编辑、删除文件和文件夹
- **本地存储**：使用 IndexedDB 进行本地存储，确保数据不会丢失
- **图片管理**：
  - 支持图片上传和管理
  - 基于 OpenSeadragon 的高性能大图查看器
  - 支持深度缩放和平移浏览
  - 图片分片上传与断点续传

### 技术特性

- **现代化技术栈**：React 19 + TypeScript + Vite
- **高性能编辑器**：基于 CodeMirror 6 构建的代码编辑器
- **美观的界面**：使用 Ant Design 组件库，提供简洁现代的用户界面
- **响应式设计**：适配不同屏幕尺寸
- **类型安全**：完整的 TypeScript 类型定义

## 技术栈

| 技术           | 版本      | 用途              |
| -------------- | --------- | ----------------- |
| React          | ^19.2.0   | 前端框架          |
| TypeScript     | ~5.9.3    | 类型系统          |
| Vite           | ^7.2.4    | 构建工具          |
| Ant Design     | ^6.2.0    | UI 组件库         |
| CodeMirror     | ^6.0.0    | 代码编辑器        |
| purrmd         | ^0.1.4    | Markdown 渲染     |
| OpenSeadragon  | latest    | 深度缩放图像查看器 |

## 快速开始

### 克隆仓库

```bash
git clone https://github.com/ffxd/easier-markdown-editor.git
cd easier-markdown-editor
```

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
easier-markdown-editor/
├── public/             # 静态资源
├── src/                # 源代码
│   ├── Icons/          # 图标组件
│   ├── components/     # 组件
│   │   └── EditorView/ # 编辑器主组件
│   │       ├── Component/            # 子组件
│   │       │   └── FileDropdown/     # 文件操作组件
│   │       │       └── Component/
│   │       │           └── ImageFolder/  # 图片文件夹组件
│   │       │               ├── hooks/        # 图片相关 Hooks
│   │       │               ├── ImageFolder.tsx
│   │       │               └── OpenSeadragonViewer.tsx  # 大图查看器
│   │       ├── extentions/    # CodeMirror 扩展
│   │       ├── hooks/         # 自定义 Hooks
│   │       ├── utils/         # 工具函数
│   │       ├── EditorView.css # 样式文件
│   │       └── EditorView.tsx # 主编辑器组件
│   ├── App.css         # 应用样式
│   ├── App.tsx         # 应用主组件
│   ├── index.css       # 全局样式
│   └── main.tsx        # 应用入口
├── .gitignore          # Git 忽略文件
├── LICENSE             # 许可证
├── README.md           # 项目文档
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript 配置
└── vite.config.js      # Vite 配置
```

## 核心功能介绍

### 编辑器组件

- **EditorView\.tsx**：编辑器主组件，包含编辑面板和预览面板
- **FileDropdown.tsx**：文件下拉菜单，用于文件操作
- **ImageFolder.tsx**：图片文件夹组件，用于管理图片
- **OpenSeadragonViewer.tsx**：基于 OpenSeadragon 的高性能大图查看器，支持深度缩放

### 存储管理

- **folderStore.ts**：文件夹和文件的存储管理（单例模式）
- **imageStore.ts**：图片的存储管理
- **useIndexedDB.ts**：IndexedDB 操作的自定义 Hook

### 工具函数

- **buildDataTree.ts**：构建文件和文件夹的树形结构
- **useFileSave.ts**：文件保存的自定义 Hook
- **useEditorSyncScroll.ts**：编辑器同步滚动的自定义 Hook
- **hashBlob.ts**：文件哈希计算（SHA-256 / djb2 fallback）

## 技术亮点

### 图片处理

- 使用 SHA-256 哈希算法进行文件完整性校验
- 支持大文件分片上传（4MB 分片大小）
- 实现断点续传功能
- 并发安全的上传队列管理

### 数据存储

- 基于 IndexedDB 的本地持久化存储
- 单例模式确保数据库连接唯一性
- 支持文件和文件夹的 CRUD 操作

### 性能优化

- 异步初始化机制，避免阻塞渲染
- Promise 链式调用管理并发任务
- 内存优化：及时释放 ImageBitmap 资源

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件
