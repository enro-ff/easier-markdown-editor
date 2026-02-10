import { Decoration, EditorView, WidgetType } from "@codemirror/view";

class nonWigdget extends WidgetType {
  constructor() {
    super();
  }

  toDOM() {
    const div = document.createElement("div");
    div.className = "cm-non";
    return div;
  }

  ignoreEvent() {
    return true
  }
}

class imageWidget extends WidgetType {
  private src: string = ""
  private alt: string = ""
  private title: string = ""
  constructor(src:string, alt?:string, title?:string) {
    super();
    this.src = src;
    this.alt = alt||"";
    this.title = title||"";
  }

  toDOM() {
    const img = document.createElement("img");
    img.src = this.src;
    img.alt = this.alt;
    img.title = this.title;
    img.style.maxWidth = "100%";
    return img;
  }

  ignoreEvent() {
    return true
  }
}

// 标题+文本样式主题：baseTheme 定义所有样式，保留原有格式+新增文本样式
const mdPreviewTheme = EditorView.baseTheme({
  // 辅助隐藏类（保留原需求）
  ".cm-non": { display: "none", width: 0, height: 0 ,padding: 0,margin: 0, pointerEvent: 'none'},
  ".cm-invisible": { visibility: "hidden" },
  // 所有标题公共样式（原生粗体/间距/行高/继承性）
  ".cm-header": {
    color: "inherit",
  },
  // H1-H6 单独字号定义（严格遵循浏览器原生比例）
  ".cm-H1": { fontSize: "2em", lineHeight: "3em" },
  ".cm-H2": { fontSize: "1.5em", lineHeight: "2.5em" },
  ".cm-H3": { fontSize: "1.17em", lineHeight: "2.17em" },
  ".cm-H4": { fontSize: "1em", lineHeight: "2em" },
  ".cm-H5": { fontSize: "0.83em", lineHeight: "1.83em" },
  ".cm-H6": { fontSize: "0.67em", lineHeight: "1.67em" },
  // 下划线样式（还原浏览器原生<u>标签样式）
  ".cm-underline": {
    textDecoration: "underline solid currentColor",
    textUnderlineOffset: "0.1em",
  },
  // 加粗样式（还原浏览器原生<b>/<strong>标签样式）
  ".cm-bold": {
    fontWeight: "bold",
  },
  // 斜体样式（还原浏览器原生<i>/<em>标签样式，使用italic而非oblique）
  ".cm-italic": {
    fontStyle: "italic",
  },
  // 删除线样式（还原浏览器原生<s>/<del>标签样式）
  ".cm-strikethrough": {
    textDecoration: "line-through solid currentColor",
    textDecorationThickness: "auto",
  },
});

// 装饰器定义：保留原有+新增文本样式（文本样式用mark装饰器，适配行内局部文本）
const nonDecoration = Decoration.mark({ class: "cm-non" });
// 标题行装饰器（整行生效）
const H1Decoration = Decoration.line({ class: "cm-header cm-H1" });
const H2Decoration = Decoration.line({ class: "cm-header cm-H2" });
const H3Decoration = Decoration.line({ class: "cm-header cm-H3" });
const H4Decoration = Decoration.line({ class: "cm-header cm-H4" });
const H5Decoration = Decoration.line({ class: "cm-header cm-H5" });
const H6Decoration = Decoration.line({ class: "cm-header cm-H6" });
//文本样式标记装饰器（行内局部文本生效，与原生标签布局一致）
const underlineDecoration = Decoration.mark({ class: "cm-underline" });
const invisibleDecoration = Decoration.mark({ class: "cm-invisible" });
const nonWidgetDecoration = Decoration.replace({});
function imageDecoration(src: string, alt?: string, title?: string){
  const widget = new imageWidget(src, alt, title);
  const deco = Decoration.replace({ widget });
  return deco
}

// 完整装饰器对象
const nodeDecoration = {
  non: nonDecoration,
  H1: H1Decoration,
  H2: H2Decoration,
  H3: H3Decoration,
  H4: H4Decoration,
  H5: H5Decoration,
  H6: H6Decoration,
  underline: underlineDecoration,
  invisible: invisibleDecoration,
  nonWidget: nonWidgetDecoration,
  imageDecoration: imageDecoration
};

export { mdPreviewTheme, nodeDecoration };
