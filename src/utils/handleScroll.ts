
import { EditorView } from '@codemirror/view';
import type { RefObject } from 'react';

type EditorState = EditorView | null;

class HandleScroll {
  private codeEditor : RefObject<EditorState>;
  private previewEditor : RefObject<EditorState>;

  constructor() {
    this.codeEditor = {current: null};
    this.previewEditor = {current: null};  
  }

  createCodeEditor = (ref: RefObject<EditorState>) => {
    this.codeEditor = ref;
  }

  createPreviewEditor = (ref: RefObject<EditorState>) => {
    this.previewEditor = ref;
  }

  handleScroll = (evn: Event) => {
    if(this.codeEditor.current === null || this.previewEditor.current === null){
      return;
    }

    
    const targetView = evn.target === this.codeEditor.current.scrollDOM ? this.codeEditor.current : this.previewEditor.current;
    const sideView = evn.target === this.codeEditor.current.scrollDOM ? this.previewEditor.current : this.codeEditor.current;


    const targetDOM = targetView.scrollDOM;
    const sideDOM = sideView.scrollDOM;
    
    //计算目标视图对应滚动位置行号+行比例
    const targetTop = targetDOM.scrollTop;
    const targetLineNumber = targetView.elementAtHeight(targetTop).from;
    const targetLineTop = targetView.lineBlockAt(targetLineNumber).top;
    const targetLineHeight = targetView.lineBlockAt(targetLineNumber).bottom - targetLineTop;
    const lineScrollRatio = (targetTop - targetLineTop) / targetLineHeight
    
    const sideLineTop = sideView.lineBlockAt(targetLineNumber).top;
    const sideLineHeight = sideView.lineBlockAt(targetLineNumber).bottom - sideLineTop
    const sideTop = sideLineTop + lineScrollRatio * sideLineHeight;
    
    sideDOM.scrollTop = sideTop;
  }
}


export default HandleScroll;