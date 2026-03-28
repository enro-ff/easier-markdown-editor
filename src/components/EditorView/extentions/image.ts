import { syntaxTree } from "@codemirror/language";
import type { Extension, Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";

import type { FormattingDisplayMode } from "purrmd";
import { findNodeURL, isSelectRange, isFocusEventState, isForceUpdateEventState } from "./utils";
import useIndexedDB from "../hooks/useIndexedDB";
import { createImageStore } from "../utils/imageStore";

export const imageClass = {
  image: "purrmd-cm-image",
};

const sharedStore = createImageStore(useIndexedDB());
const DB_PROTOCOL = "db://";

class ImageWidget extends WidgetType {
  private src: string;
  private alt: string;
  private title: string;
  constructor(src: string, alt?: string, title?: string) {
    super();
    this.src = src;
    this.alt = alt || "";
    this.title = title || "";
  }

  toDOM() {
    const img = document.createElement("img");
    if (this.src.startsWith(DB_PROTOCOL)) {
      sharedStore
        .getObjectURL(this.src.replace(DB_PROTOCOL, ""))
        .then((url) => {
          img.src = url;
        })
        .catch(() => {
          img.alt = "Image missing";
        });
    } else {
      img.src = this.src;
    }
    img.alt = this.alt;
    img.title = this.title;
    img.className = imageClass.image;
    img.style.maxWidth = "100%";
    return img;
  }

  eq(other: ImageWidget) {
    return this.src === other.src && this.alt === other.alt && this.title === other.title;
  }

  ignoreEvent() {
    return true;
  }

  destroy(dom: HTMLElement) {
    if (this.src.startsWith(DB_PROTOCOL)) {
      sharedStore.revokeObjectURL(this.src.replace(DB_PROTOCOL, ""));
    }
    super.destroy(dom);
  }
}

function imageDecorations(
  mode: FormattingDisplayMode,
  config: ImageConfig | undefined,
  view: EditorView,
): DecorationSet {
  const state = view.state;
  const decorations: Range<Decoration>[] = [];
  syntaxTree(state).iterate({
    enter(node) {
      if (mode === "show") return;
      if (node.type.name === "Image") {
        const isSelect = isSelectRange(state, node);
        if (!config?.imageAlwaysShow && isSelect) return;
        const rawUrl = findNodeURL(state, node);
        let url = rawUrl;
        if (config?.proxyURL) url = config.proxyURL(rawUrl || "");
        const widget = new ImageWidget(url ?? "", undefined, undefined);
        if (isSelect) {
          decorations.push(
            Decoration.widget({ widget, side: 1 }).range(node.to),
          );
        } else {
          decorations.push(
            Decoration.replace({ widget, side: -1 }).range(node.from, node.to),
          );
        }
      }
    },
  });
  return Decoration.set(decorations, true);
}

export function image(mode: FormattingDisplayMode, config?: ImageConfig): Extension {
  if (config == null) config = {};
  config.imageAlwaysShow ??= true;
  const imagePlugin: Extension = ViewPlugin.fromClass(
    class {
      private updateCount = 0;
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = imageDecorations(mode, config, view);
      }
      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.selectionSet ||
          isFocusEventState(update.startState, update.state) ||
          isForceUpdateEventState(update.startState, update.state)
        ) {
          this.decorations = imageDecorations(mode, config, update.view);
          this.updateCount++;
          if (this.updateCount > 1000) {
            this.updateCount = 0;
          }
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
  return imagePlugin;
}

export interface ImageConfig {
  proxyURL?: (url: string) => string;
  imageAlwaysShow?: boolean;
  NoImageAvailableLabel?: string;
  ImageLoadFailedLabel?: (url: string) => string;
  onImageDown?: (
    e: MouseEvent,
    url: string | null | undefined,
    rawUrl: string | null | undefined,
  ) => void;
}
