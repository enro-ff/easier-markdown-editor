import React, { useEffect, useRef, use } from "react";
import OpenSeadragon from "openseadragon";

interface OpenSeadragonViewerProps {
  src: string | Blob;
}

// 缓存 ImageBitmap Promise 以确保 use() 的稳定性
const bitmapPromiseCache = new WeakMap<Blob, Promise<ImageBitmap>>();

function getBitmapPromise(blob: Blob) {
  let promise = bitmapPromiseCache.get(blob);
  if (!promise) {
    promise = createImageBitmap(blob);
    bitmapPromiseCache.set(blob, promise);
  }
  return promise;
}

const OpenSeadragonViewer: React.FC<OpenSeadragonViewerProps> = ({ src }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const osdRef = useRef<OpenSeadragon.Viewer | null>(null);
  const imageBitmapRef = useRef<ImageBitmap | null>(null);

  // 如果 src 是 Blob，使用 use() 钩子解析 ImageBitmap
  const resolvedBitmap = src instanceof Blob ? use(getBitmapPromise(src)) : null;

  useEffect(() => {
    const initViewer = async () => {
      if (!viewerRef.current || !src) return;

      // 销毁旧实例
      if (osdRef.current) {
        osdRef.current.destroy();
        osdRef.current = null;
      }

      // 注意：这里不再手动关闭 imageBitmapRef.current，
      // 因为它现在由 use() 管理或作为局部变量。
      // 但为了 OpenSeadragon 的自定义加载器，我们仍需要引用它。
      imageBitmapRef.current = resolvedBitmap;

      let tileSource: any;

      if (src instanceof Blob) {
        if (!resolvedBitmap) return;

        tileSource = {
          width: resolvedBitmap.width,
          height: resolvedBitmap.height,
          tileSize: 256, // 瓦片大小
          getTileUrl: () => "", // 不需要 URL
        };
      } else {
        // 处理普通 URL
        tileSource = {
          type: "image",
          url: src,
          buildPyramid: false,
        };
      }

      // 初始化 OpenSeadragon
      const viewer = OpenSeadragon({
        element: viewerRef.current,
        prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
        tileSources: tileSource,
        showNavigationControl: true,
        showNavigator: true,
        navigatorPosition: "BOTTOM_RIGHT",
        gestureSettingsMouse: {
          clickToZoom: true,
        },
        panHorizontal: true,
        panVertical: true,
        visibilityRatio: 1,
        constrainDuringPan: true,
        defaultZoomLevel: 0,
        minZoomLevel: 0,
        maxZoomLevel: 10,
      });

      osdRef.current = viewer;

      // 如果是 Blob 模式，设置自定义瓦片加载器
      if (src instanceof Blob && resolvedBitmap) {
        viewer.addHandler("open", () => {
          const tiledImage = viewer.world.getItemAt(0);
          if (tiledImage) {
            // @ts-ignore - OpenSeadragon types might not include setCustomTileLoader
            tiledImage.setCustomTileLoader((tile: any, callback: (canvas: HTMLCanvasElement) => void) => {
              const canvas = document.createElement("canvas");
              canvas.width = tile.sourceBounds.width;
              canvas.height = tile.sourceBounds.height;

              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(
                  resolvedBitmap,
                  tile.sourceBounds.x,
                  tile.sourceBounds.y,
                  tile.sourceBounds.width,
                  tile.sourceBounds.height,
                  0,
                  0,
                  tile.sourceBounds.width,
                  tile.sourceBounds.height
                );
              }
              callback(canvas);
            });
          }
        });
      }
    };

    initViewer();

    return () => {
      if (osdRef.current) {
        osdRef.current.destroy();
        osdRef.current = null;
      }
      // 注意：resolvedBitmap 的生命周期由 React 管理，
      // 但如果 OpenSeadragon 销毁了，我们可能需要清理。
      // 不过 ImageBitmap 通常在不再被引用时会被垃圾回收，
      // 或者在下一次 use() 之前保持。
    };
  }, [src, resolvedBitmap]);

  return (
    <div
      ref={viewerRef}
      style={{
        width: "100%",
        height: "calc(90vh - 120px)",
        background: "#000",
        borderRadius: "8px",
        overflow: "hidden",
        position: "relative",
      }}
    />
  );
};

export default OpenSeadragonViewer;
