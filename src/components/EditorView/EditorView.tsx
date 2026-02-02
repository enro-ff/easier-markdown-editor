import { useEffect, useRef, useState } from "react";
import { Radio, Splitter } from "antd";
import "./EditorView.css";
import { useEditorSyncScroll } from "./hooks/useEditorSyncScroll";
import { history } from "@codemirror/commands";
import { Annotation, EditorState } from "@codemirror/state";
import { Transaction, type Extension } from "@codemirror/state";
import { EditorView, ViewPlugin } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";

type ViewMode = "code" | "split" | "preview";

const syncAnnotation = Annotation.define<boolean>();
function syncDispatch(main: EditorView, other: EditorView, tr: Transaction) {
  main.update([tr]);
  if (!tr.changes.empty && !tr.annotation(syncAnnotation)) {
    const annotations: Annotation<boolean | string>[] = [
      syncAnnotation.of(true),
    ];
    const userEvent = tr.annotation(Transaction.userEvent);
    if (userEvent) annotations.push(Transaction.userEvent.of(userEvent));
    other.dispatch({ changes: tr.changes, annotations });
  }
}

export default function MDEditor() {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const previewEditorViewRef = useRef<EditorView | null>(null);
  const codeEditorViewRef = useRef<EditorView | null>(null);
  const codeContainerRef = useRef<HTMLElement>(undefined);
  const previewContainerRef = useRef<HTMLElement>(undefined);

  const handleSyncScroll = useEditorSyncScroll({
    codeEditorViewRef,
    previewEditorViewRef,
  });

  const handleScroll = () =>
    ViewPlugin.fromClass(class {}, {
      eventHandlers: {
        scroll: (e) => {
          handleSyncScroll(e);
          console.log("1")
        },
      },
    });

  const CreateEditorState = (extensions?: Array<Extension>): EditorState => {
    const defaultextensions = [
      EditorView.lineWrapping,
      markdown({ codeLanguages: languages }),
      handleScroll(),
    ];
    const fullextensions = extensions
      ? [...defaultextensions, ...extensions]
      : [...defaultextensions];
    return EditorState.create({
      doc: '# Mini Markdown Editor\n## 介绍\nMini Markdown Editor 是 2025年寒假字节青训营「前端」的一个开源项目。\n\n## 架构\n该项目采用 `pnpm` + `monorepo` 进行管理，包含两个核心子项目：\n- `@mini-markdown-rc/ast-parser`：核心库，实现 Markdown 语法的 AST 解析器，用于解析 Markdown 文本，生成 AST、HTML。\n- `@mini-markdown-rc/editor`：一款 React 的 Markdown 编辑器。\n## 优点\n简单易用、轻量、性能高，十万➕内容依然流畅。\n# 快速开始\n## 安装\n```bash\n# npm\nnpm install @mini-markdown-rc/editor\n# yarn\nyarn add install @mini-markdown-rc/editor\n# pnpm\npnpm add install @mini-markdown-rc/editor\n```\n## 使用\n```tsx\nimport { Editor } from "@mini-markdown-rc/editor";\nexport default function App() {\nreturn <Editor />;\n}\n``` ',
      extensions: fullextensions,
    });
  };

  useEffect(() => {
    const codeEditorView = new EditorView({
      state: CreateEditorState([history(),      syntaxHighlighting(defaultHighlightStyle),]),
      parent: codeContainerRef.current,
      dispatch: (tr) => {
        if (codeEditorViewRef.current && previewEditorViewRef.current) {
          syncDispatch(
            codeEditorViewRef.current,
            previewEditorViewRef.current,
            tr,
          );
        }
      },
    });

    const previewEditorView = new EditorView({
      state: CreateEditorState(),
      parent: previewContainerRef.current,
      dispatch: (tr) => {
        if (codeEditorViewRef.current && previewEditorViewRef.current) {
          syncDispatch(
            previewEditorViewRef.current,
            codeEditorViewRef.current,
            tr,
          );
        }
      },
    });

    codeEditorViewRef.current = codeEditorView;
    previewEditorViewRef.current = previewEditorView;

    return () => {
      codeEditorView.destroy();
      previewEditorView.destroy();
      codeEditorViewRef.current = null;
      previewEditorViewRef.current = null;
    };
  }, []);

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
          ref={codeContainerRef}
        ></div>
        {/* Preview Pane */}
        <div
          className={`${viewMode === "code" ? "hidden" : ""}`}
          style={{ width: viewMode === "split" ? "50%" : "100%" }}
          ref={previewContainerRef}
        ></div>
      </Splitter>
    </div>
  );
}
