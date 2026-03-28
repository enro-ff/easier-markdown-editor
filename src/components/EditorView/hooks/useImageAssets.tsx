import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorSelection, type TransactionSpec } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { message } from "antd";
import { createImageStore, type StoredImageMeta } from "../utils/imageStore";

interface UseImageAssetsOptions {
  codeEditorViewRef: React.MutableRefObject<EditorView | null>;
  codeContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  previewContainerRef?: React.MutableRefObject<HTMLDivElement | null>;
  dbPromise: Promise<IDBDatabase>;
}

export const useImageAssets = ({
  codeEditorViewRef,
  codeContainerRef,
  previewContainerRef,
  dbPromise,
}: UseImageAssetsOptions) => {
  const store = useMemo(() => createImageStore(dbPromise), [dbPromise]);
  const [managerOpen, setManagerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [images, setImages] = useState<StoredImageMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(
    async (nextPage = page, nextPageSize = pageSize) => {
      setLoading(true);
      try {
        const { items, total: t } = await store.list(nextPage, nextPageSize);
        setImages(items);
        setTotal(t);
        setPage(nextPage);
        setPageSize(nextPageSize);
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, store],
  );

  const insertMarkdown = useCallback(
    (meta: StoredImageMeta) => {
      const view = codeEditorViewRef.current;
      if (!view) return;
      const alt = meta.name.replace(/\.[^.]+$/, "") || "image";
      const insertText = `![${alt}](db://${meta.id})`;
      const from = view.state.selection.main.from;
      const to = view.state.selection.main.to;
      const tr: TransactionSpec = {
        changes: { from, to, insert: insertText },
        selection: EditorSelection.cursor(from + insertText.length),
      };
      view.dispatch(tr);
    },
    [codeEditorViewRef],
  );

  const handleFiles = useCallback(
    async (files: File[] | FileList) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!list.length) return;
      setUploading(true);
      try {
        const metas = await store.bulkImport(list);
        metas.forEach((meta) => insertMarkdown(meta));
        if (managerOpen) refresh(1);
        message.success(`Imported ${metas.length} image(s)`);
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error);
        message.error(text || "Import image failed");
      } finally {
        setUploading(false);
      }
    },
    [insertMarkdown, managerOpen, refresh, store],
  );

  const onPaste = useCallback(
    (event: ClipboardEvent) => {
      if (!event.clipboardData) return;
      const items = Array.from(event.clipboardData.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (!items.length) return;
      event.preventDefault();
      void handleFiles(items);
    },
    [handleFiles],
  );

  const onDrop = useCallback(
    (event: DragEvent) => {
      if (!event.dataTransfer) return;
      const files = Array.from(event.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (!files.length) return;
      event.preventDefault();
      void handleFiles(files);
    },
    [handleFiles],
  );

  useEffect(() => {
    const codeContainer = codeContainerRef.current;
    if (!codeContainer) return;
    const prevent = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    codeContainer.addEventListener("dragover", prevent);
    codeContainer.addEventListener("drop", onDrop);
    codeContainer.addEventListener("paste", onPaste as unknown as EventListener);
    return () => {
      codeContainer.removeEventListener("dragover", prevent);
      codeContainer.removeEventListener("drop", onDrop);
      codeContainer.removeEventListener("paste", onPaste as unknown as EventListener);
    };
  }, [codeContainerRef, onDrop, onPaste]);

  useEffect(() => {
    const previewContainer = previewContainerRef?.current;
    if (!previewContainer) return;
    const dragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    previewContainer.addEventListener("paste", onPaste as unknown as EventListener);
    previewContainer.addEventListener("drop", onDrop);
    previewContainer.addEventListener("dragover", dragOver);
    return () => {
      previewContainer.removeEventListener("paste", onPaste as unknown as EventListener);
      previewContainer.removeEventListener("drop", onDrop);
      previewContainer.removeEventListener("dragover", dragOver);
    };
  }, [onDrop, onPaste, previewContainerRef]);

  const openPicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      void handleFiles(e.target.files);
    },
    [handleFiles],
  );

  const removeImage = useCallback(
    async (id: string) => {
      await store.deleteImage(id);
      message.success("Image deleted");
      refresh(page);
    },
    [page, refresh, store],
  );

  const insertFromManager = useCallback(
    (meta: StoredImageMeta) => {
      insertMarkdown(meta);
      setManagerOpen(false);
    },
    [insertMarkdown],
  );

  return {
    store,
    images,
    total,
    page,
    pageSize,
    loading,
    uploading,
    managerOpen,
    setManagerOpen,
    refresh,
    openPicker,
    fileInputRef,
    onFileInputChange,
    removeImage,
    insertFromManager,
    handleFiles,
  };
};
