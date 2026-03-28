import {
  EditorSelection,
  EditorState,
  StateEffect,
  StateField,
  Transaction,
} from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import type { SyntaxNodeRef } from "@lezer/common";

// From state/focus.ts
export const focusState = StateField.define({
  create: () => false,
  update: (value, tr) => {
    if (tr.isUserEvent("cm-focus")) return true;
    if (tr.isUserEvent("cm-blur")) return false;
    return value;
  },
});

export const focusListener = EditorView.updateListener.of((update) => {
  if (update.focusChanged) {
    requestAnimationFrame(() => {
      update.view.dispatch({
        userEvent: update.view.hasFocus ? "cm-focus" : "cm-blur",
      });
    });
  }
});

export const hasFocus = (state: EditorState) => state.field(focusState);

export const isFocusEvent = (tr: Transaction) =>
  tr.isUserEvent("cm-focus") || tr.isUserEvent("cm-blur");

export const isFocusEventState = (prev: EditorState, next: EditorState) =>
  prev.field(focusState) !== next.field(focusState);

// From state/forceUpdate.ts
export const forceUpdateEffect = StateEffect.define<void>();

export const isForceUpdateEvent = (tr: Transaction) =>
  tr.effects.some((e) => e.is(forceUpdateEffect));

export const isForceUpdateEventState = (prev: EditorState, next: EditorState) =>
  getScrollState(prev) !== getScrollState(next);

export const scrollState = StateField.define<number>({
  create: () => 0,
  update: (value, tr) => {
    if (tr.effects.some((e) => e.is(forceUpdateEffect))) {
      return value + 1;
    }
    return value;
  },
});

export const getScrollState = (state: EditorState) =>
  state.field(scrollState, false) || 0;

export const debouncedScrollListener = (delay = 150) => {
  let scrollTimeout: number | null = null;

  return [
    scrollState,
    EditorView.domEventHandlers({
      scroll: (event, view) => {
        if (scrollTimeout !== null) {
          clearTimeout(scrollTimeout);
        }

        scrollTimeout = window.setTimeout(() => {
          requestAnimationFrame(() => {
            view.dispatch({
              effects: [forceUpdateEffect.of()],
            });
          });
        }, delay);
      },
    }),
  ];
};

// From types.ts
export type FormattingDisplayMode = "auto" | "show";

// From utils/utils.ts
export interface BaseRange {
  from: number;
  to: number;
}

export const isSelectRange = (state: EditorState, range: BaseRange) => {
  if (!hasFocus(state)) return false;
  return state.selection.ranges.some(
    (r) => range.from <= r.to && range.to >= r.from,
  );
};

export function findNodeURL(
  state: EditorState,
  node: SyntaxNodeRef,
): string | undefined {
  let url: string | undefined;
  if (node.name === "URL") {
    url = state.doc.sliceString(node.from, node.to);
  } else {
    const cursor = node.node.cursor();
    if (cursor.firstChild()) {
      do {
        if (cursor.name === "URL") {
          url = state.doc.sliceString(cursor.from, cursor.to);
          break;
        }
      } while (cursor.nextSibling());
    }
  }
  return url;
}

export function selectRange(view: EditorView, range: BaseRange) {
  setTimeout(() => {
    if (!view) return;
    view.dispatch({
      selection: EditorSelection.single(range.to, range.from),
    });
  }, 0);
}
