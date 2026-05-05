# 本地 WebLLM 模型（aiGenCSS）交接

## 实现方案

- **`aiGenCSS.ts`**
  - **官方 + 本地并存**：首屏 `webLlmBuiltinModelListSnapshot = prebuiltAppConfig.model_list.map(...)`，**不要**改写全局 `prebuiltAppConfig.model_list`。`getEngine` 里 `appConfig = { ...prebuiltAppConfig, model_list: [localModelRecord, ...快照] }`，再 `setAppConfig(appConfig)`，这样 **`reload(官方 model_id)` 与本地 `model_id` 都能解析**。
  - **切换方式**：`USE_LOCAL_WEBLLM_WEIGHTS`（`true` → `ACTIVE_MODEL_ID = LOCAL_MODEL_ID`；`false` → `OFFICIAL_MODEL_ID`）、`OFFICIAL_MODEL_ID` 须与快照里某条一致；本地目录名 / wasm 名与 `LOCAL_MODEL_FOLDER`、`model_lib` 路径一致。
  - **`model` / `model_lib`**：经 `absoluteArtifactUrl`（基于 `location.href`）得到**绝对 URL**；`model` 以 **`.../bin/`** 结尾，满足 WebLLM 对 `tensor-cache.json` 等基址的要求。
  - **`deleteModelAllInfoInCache(ACTIVE_MODEL_ID, appConfig)`**：在 `reload` 前执行，避免 Cache API 里误存 `index.html` 导致 `Unexpected token '<'`。
  - **失败不缓存坏 `engine`**：用局部 `instance` 调 `reload`，**成功后才 `engine = instance`**；`reload` 失败则 `unload` 后抛错。成功路径 `unload` 后 **`finally { engine = null }`**；`catch` 里同样尝试 `unload` 并清空 `engine`。
  - **并发**：`withAiGenCssLock` 串行整段「加载 → 推理 → 卸载」，减轻 TVM `Value attached to scope multiple times` 等并发问题。

- **`vite.config.js`**
  - 插件 **`webllmLocalModelBinRewrite`**：`configureServer` / `configurePreviewServer` 将 `/models/<段>/bin/resolve/main/<文件>` 重写为 `/models/<段>/bin/<文件>`，对齐 WebLLM `cleanModelUrl` 追加的 HF 路径；**纯静态部署**需在网关做同等 rewrite。

## 关键决策

- 本地条目与官方快照**合并**进每次的 `AppConfig`，避免「只配本地后官方 id 不可用」。
- 清缓存、reload、`engine` 赋值均围绕 **`ACTIVE_MODEL_ID`** 与**当次** `appConfig`，避免 id 与列表不一致。

## 注意事项

- `public/models/` 在 `.gitignore` 中；本地权重需自备，**`LOCAL_MODEL_FOLDER` 与磁盘目录一致**，wasm 文件名与 `model_lib` 一致。
- **WebGPU**；**wasm 与 `bin` 须同一套 MLC 编译且与 `@mlc-ai/web-llm` 匹配**，否则易出现 `TensorCopyFromBytes: size mismatch`。
- **勿**在 `public/models/.../bin` 下做指向自身的 **junction** 骗路径，会导致 Vite 监听 `ELOOP`。
