import { useEffect, useMemo, useRef, useState } from "react";
import { Radio, Splitter } from "antd";
import "./EditorView.css";
import { useEditorSyncScroll } from "./hooks/useEditorSyncScroll";
import { history } from "@codemirror/commands";
import {
  Annotation,
  ChangeSet,
  EditorState,
  type ChangeSpec,
  type TransactionSpec,
} from "@codemirror/state";
import { Transaction, type Extension } from "@codemirror/state";
import { EditorView, keymap, ViewPlugin } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from "@codemirror/language";
import { purrmd, purrmdTheme } from 'purrmd';
import {image} from './extentions/image.ts'
import { defaultKeymap, historyKeymap } from "@codemirror/commands";
import FileDropDown from "./Component/FileDropdown/FileDropdown";
import useIndexedDB from "./hooks/useIndexedDB";

type ViewMode = "code" | "split" | "preview";

// const deleteFilter = EditorState.transactionFilter.of((tr) => {
//   const changes: ChangeSpec[] = []
//   console.log(tr.annotation(Transaction.addToHistory))
//   if(!tr.changes.empty && !tr.annotation(syncAnnotation)){
//     tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
//       console.log(fromA,toA,fromB,toB,inserted)
//       console.log(tr.startState)
//       if(fromA === fromB ) {
//         syntaxTree(tr.startState).iterate({
//           from: fromA,
//           to: toA,
//           enter: (node) => {
//             console.log(node.to,node.name)
//             if(node.name === "StrikethroughMark" && node.to === toA && fromA+1 === toA){
//               tr.isUserEvent("redo")
//               const newFrom = node.from - 2
//               changes.push({from:newFrom, to:node.from, insert:inserted})
//               console.log(changes)
//             }
//           }
//         })
//       }
//     })
//   }
//   return changes.length?[ {changes ,annotations:tr.annotation   }]: tr;
// })
export default function MDEditor() {
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const previewEditorViewRef = useRef<EditorView | null>(null);
  const codeEditorViewRef = useRef<EditorView | null>(null);
  const codeContainerRef = useRef<HTMLElement>(undefined);
  const previewContainerRef = useRef<HTMLElement>(undefined);
  const [initialContent, setInitialContent] = useState<string>(
    `<img src="url" alt="foo" />`,
  );
  const contentRef = useRef<string>(initialContent);
  const fileDropDownRef = useRef<{updateIsSaved: () => void}>(null);
  const DBPromise = useMemo(() => useIndexedDB(), []);

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

  const codekeymap = keymap.of([defaultKeymap, historyKeymap]);

  useEffect(() => {
    const codeEditorView = new EditorView({
      state: CreateEditorState(initialContent, [history(), codekeymap]),
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
      state: CreateEditorState(initialContent, [purrmd({features: {Image: image}}), purrmdTheme()]),
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
    contentRef.current = initialContent

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
          DBPromise = {DBPromise}
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

      <Splitter className="editor-main">
        <div
          style={{
            display: viewMode === "preview" ? "none" : "block",
            width: viewMode === "split" ? "50%" : "100%",
          }}
          ref={codeContainerRef} // eslint-disable-line no-eval
        ></div>
        <div
          style={{
            display: viewMode === "code" ? "none" : "block",
            width: viewMode === "split" ? "50%" : "100%",
          }}
          ref={previewContainerRef} // eslint-disable-line no-eval
        ></div>
      </Splitter>
    </div>
  );
}
