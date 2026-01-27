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
      "# Hello Markdown\n\nEdit me on the left!",
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
