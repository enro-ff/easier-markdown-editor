
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { DecorationSet, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

export const mdWYSIWYGPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none;

    constructor(view: EditorView) {
      this.decorations = buildViewportDecoration(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildViewportDecoration(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations
  }
);

class H1Widget extends WidgetType {
  private titletext: string = "";
  constructor(titletext: string) {
    super();
    this.titletext = titletext;
  }

  toDOM(): HTMLElement {
    const h1Element = document.createElement("h1");
    h1Element.textContent = this.titletext;
    return h1Element;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function buildViewportDecoration(view: EditorView): DecorationSet {
  // 使用 DecorationSet 构建器，性能更好
  const builder = new RangeSetBuilder<Decoration>(); 
  const state = view.state;

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name === "ATXHeading1") {
          // 这里使用 node.from/to 即可，不需要解构 node
          const titleText = state.doc
            .sliceString(node.from, node.to)
            .replace(/^#\s+/, "");
            
          const h1widget = new H1Widget(titleText);
          
          const h1Decoration = Decoration.replace({ 
             widget: h1widget, // 注意：replace 加上 block: true 会替换整行，且不可编辑
          });

          // ✅ 推荐：使用 decoration 实例自带的 range 方法
          // 注意：iterate 是按顺序遍历的，直接 add 到 builder 即可
          // 如果这里不用 builder 而用数组，请继续使用你原来的数组 push 方式，
          // 但建议写成: decorationRange.push(h1Decoration.range(node.from, node.to));
          builder.add(node.from, node.to, h1Decoration);
        }
      },
    });
  }
  return builder.finish();
}