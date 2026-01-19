import { useState } from "react";
import { Radio, Splitter } from "antd";
import "./MarkdownEditor.css";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";

type ViewMode = "code" | "split" | "preview";

export default function MarkdownEditor() {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [markdownText, setMarkdownText] = useState<string>(
    "# Hello Markdown\n\nEdit me on the left!",
  );

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
        <div style={{ display: viewMode === "preview" ? "none" : "block", width: viewMode === "split" ? "50%" : "100%" }}>  
          <CodeMirror
          // className=".editor-textarea"
            value={markdownText}
            theme="light"
            height="80%"
            extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
            onChange={(value) => {
              setMarkdownText(value)
              console.log("Markdown text changed:", value);
            }}
          />
        </div>
        {/* Preview Pane */}
        <div
          className={`editor-pane preview-pane ${viewMode === "code" ? "hidden" : ""}`}
          style={{ width: viewMode === "split" ? "50%" : "100%" }}
        >
          <div
            className="preview-area"
            contentEditable={true} // Meeting the requirement "both can be edited"
            suppressContentEditableWarning={true}
          >
            {/* 
              In a real app, you would render the markdown here. 
              Since the user said "no need to generate markdown parsing syntax",
              we just show a placeholder or the raw text for now, 
              or a simple message indicating where the preview goes.
              However, to make it look "static" but functional, let's just show the text 
              or a dummy rendered view.
            */}
            <h1>Preview Area</h1>
            <p>This area is editable as requested.</p>
            <hr />
            <pre>{markdownText}</pre>
          </div>
        </div>
      </Splitter>
    </div>
  );
}
