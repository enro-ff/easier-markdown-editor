import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { history } from "@codemirror/commands"
import { languages } from "@codemirror/language-data";

const CodeEditor: React.FC<CodeEditorProps> = (props) => {
  return (
    <CodeMirror
      value={props.markdownText}
      extensions={[
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        history(),
      ]}
      onChange={(value) => {
        props.setMarkdownText(value);
        console.log("Markdown text changed:", value);
      }}
    />
  );
};
export default CodeEditor;

interface CodeEditorProps {
  markdownText: string;
  setMarkdownText: (value: string) => void;
}
