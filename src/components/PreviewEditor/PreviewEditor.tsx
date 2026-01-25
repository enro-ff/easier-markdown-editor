import React from 'react';
import CodeMirror from '@uiw/react-codemirror';

const PreviewEditor: React.FC<PreviewEditorProps> = (props) => {
  return (
    <CodeMirror
      value={props.markdownText} 
      onChange={(value) => {
              props.setMarkdownText(value);
              console.log("Markdown text changed:", value);
            }}
    />)
}
export default PreviewEditor;

interface PreviewEditorProps {
  markdownText: string;
  setMarkdownText: (value: string) => void;
}