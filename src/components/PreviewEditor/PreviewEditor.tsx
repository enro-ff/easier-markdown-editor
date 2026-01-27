import React, { useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import HandleScroll from "../../utils/handleScroll";
import { EditorView } from "@codemirror/view";
import * as events from '@uiw/codemirror-extensions-events';

const PreviewEditor: React.FC<PreviewEditorProps> = (props) => {

  const PreviewEditorRef = useRef<EditorView | null>(null);

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
      ]}
      onChange={(value) => {
        props.setMarkdownText(value);
        console.log("Markdown text changed:", value);
      }}
      onCreateEditor={(view) => {
        PreviewEditorRef.current = view;
        props.handleScrollInstance.createPreviewEditor(PreviewEditorRef);
      }}
      height="100%"
      style={{ height: "100%" }}
    />
  );
};
export default PreviewEditor;

interface PreviewEditorProps {
  markdownText: string;
  setMarkdownText: (value: string) => void;
  handleScrollInstance: HandleScroll;
}
