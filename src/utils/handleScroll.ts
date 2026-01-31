import { EditorView } from "@codemirror/view";
import type { RefObject } from "react";

type EditorState = EditorView | null;

class HandleScroll {
  private codeEditor: RefObject<EditorState>;
  private previewEditor: RefObject<EditorState>;
  private isSyncing: boolean = false; //状态锁

  constructor() {
    this.codeEditor = { current: null };
    this.previewEditor = { current: null };
  }

  createCodeEditor = (ref: RefObject<EditorState>) => {
    this.codeEditor = ref;
  };

  createPreviewEditor = (ref: RefObject<EditorState>) => {
    this.previewEditor = ref;
  };

  handleScroll = (evn: Event) => {
    if (
      this.codeEditor.current === null ||
      this.previewEditor.current === null ||
      this.isSyncing
    ) {
      //添加防抖
      return;
    }

    const targetView =
      evn.target === this.codeEditor.current.scrollDOM
        ? this.codeEditor.current
        : this.previewEditor.current;
    const sideView =
      evn.target === this.codeEditor.current.scrollDOM
        ? this.previewEditor.current
        : this.codeEditor.current;

    requestAnimationFrame(() => this.performSync(targetView, sideView));
  };

  private performSync(targetView: EditorView, sideView: EditorView) {
    if (this.isSyncing) return;
     //再次检查锁，防止RAF期间滚动
    this.isSyncing = true;
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

      console.log("同步滚动",targetView,sideView,targetView.state.doc.lines===sideView.state.doc.lines);
      sideDOM.scrollTop = sideTop;
    } catch (e) {
      console.log("同步滚动错误", e); //codemirror内部api可能报错
    } finally {
      requestAnimationFrame(() => (this.isSyncing = false)); //无论怎么样，都在下一帧解锁
    }
  }
}

export default HandleScroll;
