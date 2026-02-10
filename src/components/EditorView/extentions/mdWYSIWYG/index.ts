import { Decoration, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { nodeDecoration,mdPreviewTheme } from './Decoration'
import { RangeSetBuilder, type RangeSet } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";

function buildDecorations(view: EditorView) : RangeSet<Decoration> {
    const builder = new RangeSetBuilder<Decoration>()
    const state = view.state;

    for (const {from , to} of view.visibleRanges){
      syntaxTree(state).iterate({
        from,
        to,
        enter:(node) => {
          switch (node.name){
            case "ATXHeading1": {
              builder.add(node.from, node.from, nodeDecoration.H1);
              if(node.to - node.from > 2)builder.add(node.from, node.from + 1, nodeDecoration.non)
              break;
            }
            case "ATXHeading2": {
              builder.add(node.from, node.from, nodeDecoration.H2);
              if(node.to - node.from > 3)builder.add(node.from, node.from + 2, nodeDecoration.non)
              break;
            }
            case "ATXHeading3": {
              builder.add(node.from, node.from, nodeDecoration.H3);
              if(node.to - node.from > 4)builder.add(node.from, node.from + 3, nodeDecoration.non)  
              break;
            }
            case "ATXHeading4": {
              builder.add(node.from, node.from, nodeDecoration.H4);
              if(node.to - node.from > 5)builder.add(node.from, node.from + 4, nodeDecoration.non)
              break;
            }
            case "ATXHeading5": {
              builder.add(node.from, node.from, nodeDecoration.H5);
              if(node.to - node.from > 6)builder.add(node.from, node.from + 5, nodeDecoration.non)
              break;
            }
            case "ATXHeading6": {
              builder.add(node.from, node.from, nodeDecoration.H6);
              if(node.to - node.from > 7)builder.add(node.from, node.from + 6, nodeDecoration.non)
              break;
            }
            case "Image": {
              const text = state.sliceDoc(node.from, node.to);
              // Match markdown image syntax: ![alt](url "title") or ![alt](url)
              const match = /!\[(.*?)\]\((.*?)(?:\s+["'](.*?)["'])?\)/.exec(text);
              if (match) {
                const alt = match[1];
                const src = match[2];
                const title = match[3] || "";
                builder.add(node.from, node.to, nodeDecoration.imageDecoration(src, alt, title));
              }
              return false;
            }
            case "HTMLTag": {
              const text = state.sliceDoc(node.from, node.to);
              if (/<img\b/i.test(text)) {
                const srcMatch = /src=["'](.*?)["']/.exec(text);
                const altMatch = /alt=["'](.*?)["']/.exec(text);
                const titleMatch = /title=["'](.*?)["']/.exec(text);
                if (srcMatch) {
                  const src = srcMatch[1];
                  const alt = altMatch ? altMatch[1] : "";
                  const title = titleMatch ? titleMatch[1] : "";
                  builder.add(node.from, node.to, nodeDecoration.imageDecoration(src, alt, title));
                }
              }
            }
            // case "StrikethroughMark": {
            //   builder.add(node.from, node.to, nodeDecoration.nonWidget)
            //   break;
            // }
          }
        }
      })
    }
    return builder.finish()
}

const headerViewPlugin = ViewPlugin.fromClass(
  class {
    decorations
    lastupdateTime

    constructor(view: EditorView){
      this.decorations = buildDecorations(view);
      this.lastupdateTime = Date.now();
    }

    update(update: ViewUpdate) {
      if(update.viewportChanged){
        console.log("装饰更新")
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  {
    decorations: (v) =>{
      return v.decorations}
  }
)

export function PreviewThemeExtension() {
  return [mdPreviewTheme, headerViewPlugin]
}
