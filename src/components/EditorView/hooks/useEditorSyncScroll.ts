import { EditorView } from "@codemirror/view";
import type { RefObject } from "react";
import { useRef } from "react";

type EditorState = EditorView | null;
type EditorRefs = {
  codeEditorViewRef: RefObject<EditorState>;
  previewEditorViewRef: RefObject<EditorState>;
};

export function useEditorSyncScroll(editorRefs: EditorRefs) {
  const isSyncing = useRef<boolean>(false);

  const performSync = (targetView: EditorView, sideView: EditorView) => {
    if (isSyncing.current) return;
    //再次检查锁，防止RAF期间滚动
    isSyncing.current = true;
    try {
      const targetDOM = targetView.scrollDOM;
      const sideDOM = sideView.scrollDOM;

      //计算目标视图对应滚动位置行号+行比例
      const targetTop = targetDOM.scrollTop;
      const targetLineNumber = targetView.elementAtHeight(targetTop).from;
      const targetLineTop = targetView.lineBlockAt(targetLineNumber).top;
      const targetLineHeight =
        targetView.lineBlockAt(targetLineNumber).bottom - targetLineTop;

      const lineScrollRatio =
        targetLineHeight === 0
          ? 0
          : (targetTop - targetLineTop) / targetLineHeight; //防止行高为0 视口外 折叠代码块 附件/图片异步加载 隐藏的编辑器

      const sideLineTop = sideView.lineBlockAt(targetLineNumber).top;
      const sideLineHeight =
        sideView.lineBlockAt(targetLineNumber).bottom - sideLineTop;

      const offset = lineScrollRatio * sideLineHeight;
      const sideTop = offset < 1 ? sideLineTop : sideLineTop + offset;

      console.log(
        "同步滚动",
        targetView,
        sideView,
        targetView.state.doc.lines === sideView.state.doc.lines,
      );
      
      sideDOM.scrollTop = sideTop;
    } catch (e) {
      console.log("同步滚动错误", e); //codemirror内部api可能报错
    } finally {
      requestAnimationFrame(() => (isSyncing.current = false)); //无论怎么样，都在下一帧解锁
    }
  };

  const handleScroll = (evn: Event) => {
    const {codeEditorViewRef: codeEditor, previewEditorViewRef: previewEditor} = editorRefs
    if (
      codeEditor.current === null ||
      previewEditor.current === null ||
      isSyncing.current
    ) {
      //添加防抖
      return;
    }

    const targetView =
      evn.target === codeEditor.current.scrollDOM
        ? codeEditor.current
        : previewEditor.current;
    const sideView =
      evn.target === codeEditor.current.scrollDOM
        ? previewEditor.current
        : codeEditor.current;

    requestAnimationFrame(() => performSync(targetView, sideView));
  };

  return handleScroll;
}

