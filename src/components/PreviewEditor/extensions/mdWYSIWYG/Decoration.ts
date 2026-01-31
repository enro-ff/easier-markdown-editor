import { Decoration, EditorView } from "@codemirror/view";

// 标题+文本样式主题：baseTheme 定义所有样式，保留原有格式+新增文本样式
const headerTheme = EditorView.baseTheme({
  // 辅助隐藏类（保留原需求）
  ".cm-non": { visibility: "hidden"},
  // 所有标题公共样式（原生粗体/间距/行高/继承性）
  ".cm-header": {
    fontWeight: "bold",
    color: "inherit",
    fontSize: "inherit",
  },
  // H1-H6 单独字号定义（严格遵循浏览器原生比例）
  ".cm-H1": { fontSize: "2em", lineHeight: "2em" }, // 2em字号配1.2em行高，不拥挤
  ".cm-H2": { fontSize: "1.5em", lineHeight: "1.5em" },
  ".cm-H3": { fontSize: "1.17em", lineHeight: "1.17em" },
  ".cm-H4": { fontSize: "1em", lineHeight: "1.em" },
  ".cm-H5": { fontSize: "0.83em", lineHeight: "0.83em" },
  ".cm-H6": { fontSize: "0.67em", lineHeight: "0.67em" },
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
const boldDecoration = Decoration.mark({ class: "cm-bold" });
const italicDecoration = Decoration.mark({ class: "cm-italic" });
const strikethroughDecoration = Decoration.mark({ class: "cm-strikethrough" });

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
  bold: boldDecoration,
  italic: italicDecoration,
  strikethrough: strikethroughDecoration,
};

export {
  headerTheme,
  nodeDecoration,
};