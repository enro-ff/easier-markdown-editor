# WebLLM 迁移 Web Worker（aiGenCSS）交接

## 实现方案

- **[aiGenCSS.worker.ts](src/components/EditorView/utils/aiGenCSS.worker.ts)**：`new WebWorkerMLCEngineHandler()`，`self.onmessage` 转给 `handler.onmessage`；不构造 `AppConfig`，由主线程下发。
- **[aiGenCSS.ts](src/components/EditorView/utils/aiGenCSS.ts)**：
  - `new Worker(new URL("./aiGenCSS.worker.ts", import.meta.url), { type: "module" })` + `new WebWorkerMLCEngine(worker, { appConfig, initProgressCallback })`，再 `reload(ACTIVE_MODEL_ID, …)`。
  - **单例**：`workerRef` / `engineClient` / `initPromise` 懒初始化；**不再每次生成后 `unload`**，模型在 Worker 内常驻至页面关闭或失败清理。
  - **首次初始化前**仍 `deleteModelAllInfoInCache(ACTIVE_MODEL_ID, appConfig)`，避免坏缓存。
  - `buildAppConfigWithUrls()` 保留本地 `ModelRecord` + 官方快照合并、`absoluteArtifactUrl`（主线程 `location.href`）。
  - `withAiGenCssLock` 仅串行 `chat.completions.create`，防连点并发。

## 关键决策

- 与旧版「每次 unload」不同：**常驻**换二次生成速度与主线程减负；显存/内存占用持续到 `cleanupEngine` 或关闭页签。
- 失败路径 **`cleanupEngine`**：`unload` → `worker.terminate()` → 清空引用与 `initPromise`，下次调用重建 Worker。

## 注意事项

- **Vite**：生产构建会单独打出 `dist/assets/aiGenCSS.worker-*.js`（体积大，含 web-llm 依赖）。
- **dev/preview**：`vite.config.js` 的 `webllmLocalModelBinRewrite` 仍作用于同源 fetch；静态部署需网关同等 rewrite。
- 其余与 [本地WebLLM模型-aiGenCSS-交接.md](本地WebLLM模型-aiGenCSS-交接.md) 一致：WebGPU、wasm/bin 与包版本匹配、`public/models/` 目录与常量一致。
