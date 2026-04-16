import React, { useEffect, useRef } from "react";
import OpenSeadragon from "openseadragon";

interface OpenSeadragonViewerProps {
  src: string | Blob;
}

const OpenSeadragonViewer: React.FC<OpenSeadragonViewerProps> = ({ src }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const osdRef = useRef<OpenSeadragon.Viewer | null>(null);
  const imageBitmapRef = useRef<ImageBitmap | null>(null);

  useEffect(() => {
    const initViewer = async () => {
      if (!viewerRef.current || !src) return;

      // 销毁旧实例
      if (osdRef.current) {
        osdRef.current.destroy();
        osdRef.current = null;
      }
      if (imageBitmapRef.current) {
        imageBitmapRef.current.close();
        imageBitmapRef.current = null;
      }

      let tileSource: any;

      if (src instanceof Blob) {
        // 处理大图 Blob
        try {
          const bitmap = await createImageBitmap(src);
          imageBitmapRef.current = bitmap;

          tileSource = {
            width: bitmap.width,
            height: bitmap.height,
            tileSize: 256, // 瓦片大小
            getTileUrl: () => "", // 不需要 URL
          };
        } catch (e) {
          console.error("Failed to create ImageBitmap from blob", e);
          return;
        }
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
      if (src instanceof Blob && imageBitmapRef.current) {
        const bitmap = imageBitmapRef.current;
        
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
                  bitmap,
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
      if (imageBitmapRef.current) {
        imageBitmapRef.current.close();
        imageBitmapRef.current = null;
      }
    };
  }, [src]);

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
