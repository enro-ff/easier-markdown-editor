import { useState } from 'react';
import { Radio, Splitter } from 'antd';
import './MarkdownEditor.css';

type ViewMode = 'code' | 'split' | 'preview';

export default function MarkdownEditor() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [markdown, setMarkdown] = useState<string>('# Hello Markdown\n\nEdit me on the left!');

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
        {/* Code Pane */}
        <div 
          className={`editor-pane code-pane ${viewMode === 'preview' ? 'hidden' : ''}`}
          style={{ width: viewMode === 'split' ? '50%' : '100%' }}
        >
          <textarea
            className="editor-textarea"
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder="Type your markdown here..."
          />
        </div>

        {/* Preview Pane */}
        <div 
          className={`editor-pane preview-pane ${viewMode === 'code' ? 'hidden' : ''}`}
          style={{ width: viewMode === 'split' ? '50%' : '100%' }}
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
            <pre>{markdown}</pre>
          </div>
        </div>
      </Splitter>
    </div>
  );
}
