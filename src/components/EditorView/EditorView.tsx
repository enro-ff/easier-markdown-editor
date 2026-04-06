import { useEffect, useRef, useState } from "react";
import { Radio} from "antd";
import "./EditorView.css";
import { useEditorSyncScroll } from "./hooks/useEditorSyncScroll";
import { history } from "@codemirror/commands";
import { Annotation, EditorState } from "@codemirror/state";
import { Transaction, type Extension } from "@codemirror/state";
import { EditorView, keymap, ViewPlugin } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { purrmd, purrmdTheme } from "purrmd";
import { image } from "./extentions/image.ts";
import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import FileDropDown from "./Component/FileDropdown/FileDropdown";
import useIndexedDB from "./hooks/useIndexedDB";

type ViewMode = "code" | "split" | "preview";

export default function MDEditor() {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [splitRatio, setSplitRatio] = useState<number>(50);
  const isDrag = useRef<boolean>(false)
  const containerRef = useRef<HTMLDivElement>(null);
  const previewEditorViewRef = useRef<EditorView | null>(null);
  const codeEditorViewRef = useRef<EditorView | null>(null);
  const codeContainerRef = useRef<HTMLDivElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [initialContent, setInitialContent] = useState<string>(
    `<img src="url" alt="foo" />`,
  );
  const contentRef = useRef<string>(initialContent);
  const fileDropDownRef = useRef<{ updateIsSaved: () => void }>(null);
  const dbPromise = useIndexedDB();

  const syncAnnotation = Annotation.define<boolean>();
  function syncDispatch(main: EditorView, other: EditorView, tr: Transaction) {
    main.update([tr]);
    if (!tr.changes.empty && !tr.annotation(syncAnnotation)) {
      contentRef.current = main.state.doc.toString();
      if (fileDropDownRef.current && tr.docChanged) {
        fileDropDownRef.current.updateIsSaved();
      }
      const annotations: Annotation<boolean | string>[] = [
        syncAnnotation.of(true),
      ];
      const userEvent = tr.annotation(Transaction.userEvent);
      if (userEvent) annotations.push(Transaction.userEvent.of(userEvent));
      other.dispatch({ changes: tr.changes, annotations });
    }
  }

  const handleSyncScroll = useEditorSyncScroll({
    codeEditorViewRef,
    previewEditorViewRef,
  });

  const handleScroll = () =>
    ViewPlugin.fromClass(class {}, {
      eventHandlers: {
        scroll: (e) => {
          handleSyncScroll(e);
        },
      },
    });

  const CreateEditorState = (
    doc: string,
    extensions?: Array<Extension>,
  ): EditorState => {
    const defaultextensions = [
      EditorView.lineWrapping,
      markdown({ codeLanguages: languages, base: markdownLanguage }),
      handleScroll(),
      syntaxHighlighting(defaultHighlightStyle),
    ];
    const fullextensions = extensions
      ? [...defaultextensions, ...extensions]
      : [...defaultextensions];
    return EditorState.create({
      doc: doc,
      extensions: fullextensions,
    });
  };

  const handleMouseDown = () => {
    isDrag.current = true;
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current || !isDrag.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let newRatio = ((e.clientX - rect.left) / rect.width) * 100;
    newRatio = Math.min(Math.max(newRatio, 10), 90);
    setSplitRatio(newRatio);
  };

  const handleMouseUp = () => {
    isDrag.current = false;
    document.body.style.userSelect = "";
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }

  let codeFlex = 1, previewFlex = 1, showDragBar = false;
  if(viewMode === 'code'){
    codeFlex = 1;
    previewFlex = 0;
    showDragBar = false
  }else if(viewMode === 'preview'){
    codeFlex = 0;
    previewFlex = 1;
    showDragBar = false
  }else{
    codeFlex = splitRatio;
    previewFlex = 100 - splitRatio;
    showDragBar = true;
  }

  const codekeymap = keymap.of([...defaultKeymap, ...historyKeymap]);

  useEffect(() => {
    if (!codeContainerRef.current || !previewContainerRef.current) return;
    const codeEditorView = new EditorView({
      state: CreateEditorState(initialContent, [history(), codekeymap]),
      parent: codeContainerRef.current!,
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
      state: CreateEditorState(initialContent, [
        purrmd({ features: { Image: false } }),
        purrmdTheme(),
        image("auto", dbPromise),
      ]),
      parent: previewContainerRef.current!,
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
    contentRef.current = initialContent;

    return () => {
      codeEditorView.destroy();
      previewEditorView.destroy();
      codeEditorViewRef.current = null;
      previewEditorViewRef.current = null;
    };
  }, [initialContent]);

  return (
    <div className="editor-container">
      <div className="editor-toolbar">
        <FileDropDown
          ref={fileDropDownRef}
          contentRef={contentRef}
          setInitialContent={setInitialContent}
          DBPromise={dbPromise}
          codeEditorViewRef={codeEditorViewRef}
          codeContainerRef={codeContainerRef}
          previewContainerRef={previewContainerRef}
        />
        <Radio.Group
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          buttonStyle="solid"
          className="changeViewRadio"
        >
          <Radio.Button value="code">Code Only</Radio.Button>
          <Radio.Button value="split">Split View</Radio.Button>
          <Radio.Button value="preview">Preview Only</Radio.Button>
        </Radio.Group>
      </div>
       <div className="editor-main" ref={containerRef}>
        <div
          className="code-panel"
          style={{ flex: `${codeFlex} 1 0%`, display: codeFlex === 0 ? "none" : "flex" }}
        >
          <div ref={codeContainerRef} style={{ width: "100%", height: "100%" }} />
        </div>

        {showDragBar && (
          <div className="drag-bar" onMouseDown={handleMouseDown}>
            <div className="drag-handle" />
          </div>
        )}

        <div
          className="preview-panel"
          style={{ flex: `${previewFlex} 1 0%`, display: previewFlex === 0 ? "none" : "flex" }}
        >
          <div ref={previewContainerRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
    </div>
  );
}
