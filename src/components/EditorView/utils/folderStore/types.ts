export type ImageDimensions = Readonly<{ width: number; height: number }>;

export interface StoredMetaBase {
  id: number;
  type: "folder" | "image";
  name: string;
  parentId: number;
  url: string;
}

export interface StoredImageMeta extends StoredMetaBase {
  type: "image";
  hash: string;
  size: number;
  chunkCount: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface StoredFolderMeta extends StoredMetaBase {
  type: "folder";
}

export interface StoredChunkMeta {
  id: string | number;
  imageId: number;
  index: number;
  data: Blob;
}
