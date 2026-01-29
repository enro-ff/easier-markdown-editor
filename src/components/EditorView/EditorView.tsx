  import { useState } from "react";
  import { Radio, Splitter } from "antd";
  import "./EditorView.css";
  import PreviewEditor from "../PreviewEditor/PreviewEditor";
  import CoceEditor from "../CodeEditor/CodeEditor";
  import handleScroll from "../../utils/handleScroll";

  type ViewMode = "code" | "split" | "preview";

  export default function EditorView() {
    const [viewMode, setViewMode] = useState<ViewMode>("split");
    const [markdownText, setMarkdownText] = useState<string>(
      "# Mini Markdown Editor\n## 介绍\nMini Markdown Editor 是 2025年寒假字节青训营「前端」的一个开源项目。\n\n## 架构\n该项目采用 `pnpm` + `monorepo` 进行管理，包含两个核心子项目：\n- `@mini-markdown-rc/ast-parser`：核心库，实现 Markdown 语法的 AST 解析器，用于解析 Markdown 文本，生成 AST、HTML。\n- `@mini-markdown-rc/editor`：一款 React 的 Markdown 编辑器。\n## 优点\n简单易用、轻量、性能高，十万➕内容依然流畅。\n# 快速开始\n## 安装\n```bash\n# npm\nnpm install @mini-markdown-rc/editor\n# yarn\nyarn add install @mini-markdown-rc/editor\n# pnpm\npnpm add install @mini-markdown-rc/editor\n```\n## 使用\n```tsx\nimport { Editor } from \"@mini-markdown-rc/editor\";\nexport default function App() {\nreturn <Editor />;\n}\n``` ",
    );

    const handleScrollInstance = new handleScroll();
    return (
      <div className="editor-container">
        <div className="editor-toolbar">
          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="code">Code Only</Radio.Button>
            <Radio.Button value="split">Split View</Radio.Button>
            <Radio.Button value="preview">Preview Only</Radio.Button>
          </Radio.Group>
        </div>

        <Splitter className="editor-main">
          <div
            style={{
              display: viewMode === "preview" ? "none" : "block",
              width: viewMode === "split" ? "50%" : "100%",
            }}
          >
            <CoceEditor
              markdownText={markdownText}
              setMarkdownText={(value) => setMarkdownText(value)}
              handleScrollInstance={handleScrollInstance}
            />
          </div>
          {/* Preview Pane */}
          <div
            className={`${viewMode === "code" ? "hidden" : ""}`}
            style={{ width: viewMode === "split" ? "50%" : "100%" ,
            }}
          >
            <PreviewEditor
              markdownText={markdownText}
              setMarkdownText={(value) => setMarkdownText(value)}
              handleScrollInstance={handleScrollInstance}
            />
          </div>
        </Splitter>
      </div>
    );
  }
