import { Decoration, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { nodeDecoration,headerTheme } from './Decoration'
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
            case "ATXHeading1": {builder.add(node.from, node.from, nodeDecoration.H1);
              if(node.to - node.from > 2)builder.add(node.from, node.from + 2, nodeDecoration.non)
              break;
            }
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
  return [headerTheme, headerViewPlugin]
}
