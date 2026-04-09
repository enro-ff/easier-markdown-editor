import { syntaxTree } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { TreeCursor } from "@lezer/common";
import { Text } from "@codemirror/state";

/**
 * 忽略 Lezer 树中的标记符
 * 新增了 'URL' 和 'ImageMark' (!)
 */
const MARKERS = new Set([
  "HeaderMark",
  "ListMark",
  "QuoteMark",
  "EmphasisMark",
  "CodeMark",
  "LinkMark",
  "CodeInfo",
  "URL",
  "ImageMark",
]);

function createHtmlNode(name: string): HTMLElement | null {
  switch (name) {
    case "Document":
      return document.createElement("div");
    case "ATXHeading1":
      return document.createElement("h1");
    case "ATXHeading2":
      return document.createElement("h2");
    case "ATXHeading3":
      return document.createElement("h3");
    case "ATXHeading4":
      return document.createElement("h4");
    case "ATXHeading5":
      return document.createElement("h5");
    case "ATXHeading6":
      return document.createElement("h6");
    case "Paragraph":
      return document.createElement("p");
    case "StrongEmphasis":
      return document.createElement("strong");
    case "Emphasis":
      return document.createElement("em");
    case "InlineCode":
      return document.createElement("code");
    case "BulletList":
      return document.createElement("ul");
    case "OrderedList":
      return document.createElement("ol");
    case "ListItem":
      return document.createElement("li");
    case "Blockquote":
      return document.createElement("blockquote");
    case "Link":
      return document.createElement("a"); // <-- 链接
    case "Image":
      return document.createElement("img"); // <-- 图片
    case "FencedCode": {
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      pre.appendChild(code);
      return pre;
    }
    default:
      return null;
  }
}

export async function parseCmToHtml(props: props) {
  const { view, getImageUrl } = props;

  async function buildHtml(
    cursor: TreeCursor,
    doc: Text,
    parentEl: HTMLElement,
  ) {
    const name = cursor.name;
    const from = cursor.from;
    const to = cursor.to;

    const currentEl = createHtmlNode(name);

    // ==========================================
    // 处理链接 (Link) 的 href
    // ==========================================
    if (name === "Link" && currentEl) {
      // 获取当前节点的 SyntaxNode 对象，方便直接查找子节点
      const urlNode = cursor.node.getChild("URL");
      if (urlNode) {
        (currentEl as HTMLAnchorElement).href = doc.sliceString(
          urlNode.from,
          urlNode.to,
        );
        (currentEl as HTMLAnchorElement).target = "_blank";
      }
    }

    // ==========================================
    // 处理图片 (Image) 的 src 和 alt
    // ==========================================
    if (name === "Image" && currentEl) {
      const urlNode = cursor.node.getChild("URL");
      if (urlNode) {
        let src = doc.sliceString(urlNode.from, urlNode.to);
        if (src.startsWith("./") || src.startsWith("../")) {
          src = (await getImageUrl(src)) || ""; // 如果 getImageUrl 返回 undefined，就使用原始 src
        }
        (currentEl as HTMLImageElement).src = src;
      }

      // 提取 alt 文本：遍历图片的子节点，拼接所有非标记节点的纯文本
      let altText = "";
      let child = cursor.node.firstChild;
      while (child) {
        if (!MARKERS.has(child.name)) {
          altText += doc.sliceString(child.from, child.to);
        }
        child = child.nextSibling;
      }
      (currentEl as HTMLImageElement).alt = altText;

      // 图片是自闭合标签，直接挂载后返回，**不要**执行后面的子节点递归
      if (currentEl !== parentEl) {
        parentEl.appendChild(currentEl);
      }
      return;
    }

    // 其他节点的常规处理
    const targetEl = currentEl || parentEl;
    let containerForChildren = targetEl;
    if (name === "FencedCode") {
      containerForChildren = targetEl.querySelector("code") || targetEl;
    }

    // 递归遍历子节点 (链接的文本也会在这里被正常解析并放入 <a> 中)
    if (cursor.firstChild()) {
      let childPos = from;
      do {
        if (cursor.from > childPos && !MARKERS.has(name)) {
          const text = doc.sliceString(childPos, cursor.from);
          if (text)
            containerForChildren.appendChild(document.createTextNode(text));
        }

        await buildHtml(cursor, doc, containerForChildren);
        childPos = cursor.to;
      } while (cursor.nextSibling());

      cursor.parent();

      if (to > childPos && !MARKERS.has(name)) {
        const text = doc.sliceString(childPos, to);
        if (text)
          containerForChildren.appendChild(document.createTextNode(text));
      }
    } else {
      // 叶子节点
      if (!MARKERS.has(name)) {
        const text = doc.sliceString(from, to);
        if (text)
          containerForChildren.appendChild(document.createTextNode(text));
      }
    }

    if (currentEl && currentEl !== parentEl) {
      parentEl.appendChild(currentEl);
    }
  }
  const tree = syntaxTree(view.state);
  const doc = view.state.doc;
  const root = document.createElement("div");
  root.className = "markdown-print-body";

  const cursor = tree.cursor();
  await buildHtml(cursor, doc, root);

  return root;
}

export function printHtmlToPdf(htmlElement: HTMLElement, title = "Document", targetIframe?: HTMLIFrameElement) {
  let iframe = targetIframe;
  let isNewIframe = false;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
    isNewIframe = true;
  }

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) return;

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          /* 通用样式 */
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
          }
          h1, h2, h3 { color: #111; page-break-after: avoid; }
          pre { background: #f5f5f5; padding: 1em; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; }
          code { font-family: Consolas, Monaco, "Courier New", monospace; background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
          pre code { background: none; padding: 0; }
          blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 1em; color: #666; }
          a { color: #0366d6; text-decoration: none; }
          a:hover { text-decoration: underline; }
          img { max-width: 100%; height: auto; border-radius: 4px; display: block; margin: 10px 0; }

          /* A4 纸张模拟 */
          .markdown-print-body {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 0 auto;
            background: white;
            box-sizing: border-box;
          }

          @media screen {
            body { 
              background: #f0f2f5; 
              padding: 20px 0;
            }
            .markdown-print-body {
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
              border: 1px solid #ddd;
            }
          }

          @media print {
            @page { 
              size: A4; 
              margin: 0; 
            }
            body { 
              background: white; 
            }
            .markdown-print-body {
              margin: 0;
              box-shadow: none;
              border: none;
            }
          }
        </style>
      </head>
      <body>
        ${htmlElement.outerHTML}
      </body>
    </html>
  `);
  iframeDoc.close();

  // 等待图片等资源加载完毕再打印，避免图片在 PDF 中空白
  if (isNewIframe) {
    setTimeout(() => {
      iframe!.contentWindow?.focus();
      iframe!.contentWindow?.print();

      setTimeout(() => {
        document.body.removeChild(iframe!);
      }, 1000);
    }, 500); // 给 500ms 缓冲时间让图片请求发出并渲染
  }
}

export default async function printEditorAsPdf(props: props) {
  const htmlRoot = await parseCmToHtml(props);
  printHtmlToPdf(htmlRoot, "CodeMirror-Markdown-Export");
}

interface props {
  view: EditorView;
  getImageUrl: (url: string) => Promise<string | undefined>;
}
