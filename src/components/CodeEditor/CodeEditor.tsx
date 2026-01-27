import React from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { history } from "@codemirror/commands";
import { languages } from "@codemirror/language-data";
import HandleScroll from "../../utils/handleScroll";
import { EditorView } from "@codemirror/view";
import * as events from "@uiw/codemirror-extensions-events";
import { useRef } from "react";

const CodeEditor: React.FC<CodeEditorProps> = (props) => {
  const CodeEditorRef = useRef<EditorView | null>(null);

  const ScrollEvt = events.scroll({
    scroll: (evn: Event) => {
      props.handleScrollInstance.handleScroll(evn);
    },
  });

  return (
    <CodeMirror
      value={props.markdownText}
      extensions={[
        ScrollEvt,
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        history(),
      ]}
      onChange={(value) => {
        props.setMarkdownText(value);
      }}
      onCreateEditor={(view) => {
        CodeEditorRef.current = view;
        props.handleScrollInstance.createCodeEditor(CodeEditorRef);
        console.log(ScrollEvt);
      }}
      height="100%"
      style={{ height: "100%" }}
    />
  );
};
export default CodeEditor;

interface CodeEditorProps {
  markdownText: string;
  setMarkdownText: (value: string) => void;
  handleScrollInstance: HandleScroll;
}
