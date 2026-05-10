import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

/**
 * Dedicated Worker：承载 MLCEngine（WebGPU/WASM），与主线程通过 WebLLM 协议通信。
 * AppConfig / reload 由主线程 `WebWorkerMLCEngine` 下发。
 */
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (event: MessageEvent) => {
  handler.onmessage(event);
};
