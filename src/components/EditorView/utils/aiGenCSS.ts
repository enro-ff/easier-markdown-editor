import {
  MLCEngine,
  prebuiltAppConfig,
  deleteModelAllInfoInCache,
  type AppConfig,
  type ChatCompletionMessageParam,
  type ModelRecord,
} from "@mlc-ai/web-llm";

/**
 * 包内自带的官方 `model_list` 快照（勿改写全局 `prebuiltAppConfig.model_list`，否则官方 id 会丢）。
 * 在首屏 import 时拷贝一次即可。
 */
const webLlmBuiltinModelListSnapshot: ModelRecord[] = prebuiltAppConfig.model_list.map(
  (record) => ({ ...record }),
);

/** 与 `public/models/` 下目录名一致；含空格，仅用于 URL 路径段编码 */
const LOCAL_MODEL_FOLDER = "Qwen3-0.6B-q4f16";
const LOCAL_MODEL_ID = "Qwen3-0.6B-q4f16";

/** 为 true：加载 `LOCAL_MODEL_ID`（`public/models/...`）；为 false：用下方官方 id 从 HuggingFace 拉取 */
const USE_LOCAL_WEBLLM_WEIGHTS = true;
/** 须与 `webLlmBuiltinModelListSnapshot` 中某条 `model_id` 一致，参见 WebLLM 文档 / prebuilt 列表 */
const OFFICIAL_MODEL_ID = "Qwen3-0.6B-q4f16_1-MLC";
const ACTIVE_MODEL_ID = USE_LOCAL_WEBLLM_WEIGHTS ? LOCAL_MODEL_ID : OFFICIAL_MODEL_ID;

const viteBase = String(import.meta.env.BASE_URL ?? "/").replace(/\/?$/, "");
const encodedModelDir = LOCAL_MODEL_FOLDER.split("/").map(encodeURIComponent).join("/");
/** 站点根相对路径，如 `/models/...` */
const localModelRootPath = `${viteBase}/models/${encodedModelDir}`.replace(/\/{2,}/g, "/");

/**
 * WebLLM 内部会对权重目录执行 `new URL('tensor-cache.json', modelBase)`，
 * `modelBase` 必须是合法绝对 URL，且应以 `/` 结尾，否则相对路径会解析到错误的目录。
 */
function absoluteArtifactUrl(pathFromSiteRoot: string): string {
  const path = pathFromSiteRoot.startsWith("/")
    ? pathFromSiteRoot
    : `/${pathFromSiteRoot}`;
  const pageHref = globalThis.location?.href;
  if (!pageHref) {
    throw new Error("WebLLM 需要在浏览器环境运行（缺少 location.href）。");
  }
  return new URL(path, pageHref).href;
}

let engine: MLCEngine | null = null;

/** 串行化整段「加载 → 推理 → 卸载」，避免并发触发 TVM scope 错误 */
let aiGenCssQueue: Promise<void> = Promise.resolve();

function withAiGenCssLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = aiGenCssQueue;
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  aiGenCssQueue = next;
  return prev.then(async () => {
    try {
      return await fn();
    } finally {
      release();
    }
  });
}

async function getEngine() {
  if (engine) return engine;

  const modelBinDirUrl = absoluteArtifactUrl(`${localModelRootPath}/bin/`);
  const modelLibUrl = absoluteArtifactUrl(
    `${localModelRootPath}/wasm/Qwen3-0.6B-q4f16_1_cs1k-webgpu.wasm`,
  );

  const localModelRecord: ModelRecord = {
    model_id: LOCAL_MODEL_ID,
    model_lib: modelLibUrl,
    model: modelBinDirUrl,
    vram_required_MB: 1629.49,
    low_resource_required: true,
    overrides: {
      context_window_size: 4096,
    },
  };

  const appConfig: AppConfig = {
    ...prebuiltAppConfig,
    model_list: [localModelRecord, ...webLlmBuiltinModelListSnapshot],
  };

  await deleteModelAllInfoInCache(ACTIVE_MODEL_ID, appConfig);

  const instance = new MLCEngine();
  instance.setInitProgressCallback((report) => {
    console.log(`[进度] ${report.text}`);
  });

  instance.setAppConfig(appConfig);
  console.log(`正在加载 WebLLM 模型 ${ACTIVE_MODEL_ID} ...`, {
    useLocalWeights: USE_LOCAL_WEBLLM_WEIGHTS,
    modelBinDirUrl,
    modelLibUrl,
  });
  try {
    await instance.reload(ACTIVE_MODEL_ID, { temperature: 0.7, top_p: 0.9 });
  } catch (err) {
    try {
      await instance.unload();
    } catch {
      /* ignore */
    }
    throw err;
  }
  engine = instance;
  return engine;
}



async function aiGenCSS(prompt: string) {
  return withAiGenCssLock(async () => {
    try {
      const engineInstance = await getEngine();

      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `你是一个 CSS 专家。请根据用户的需求，生成一段适合 Markdown 文档打印在 A4 纸张上的 CSS 代码。
                  只包含 CSS 规则，不要任何 Markdown 代码块包裹，也不要任何解释说明文字。
                  你的输出应该直接可以放入 <style> 标签中。
                  正确示例输出：
                  h1 { color: red; }
                  .markdown-print-body { font-size: 16px; }
                  /'
  `,
        },
        { role: "user", content: prompt + '/nothink' },
      ];

      console.log(`用户: ${prompt}`);

      const reply = await engineInstance.chat.completions.create({
        messages,
        stream: false,
        max_tokens: 500,
        stop: ["/END/"],
        temperature: 0.2,
        presence_penalty: 1,
      });

      try {
        await engineInstance.unload();
      } finally {
        engine = null;
      }

      let content = reply.choices[0].message.content || "";
      console.log(`AI: `, reply);

      const cssRegCodeFrameRegex = /```(?:css|)\n?([\s\S]*?)(?:```|$)/i;
      const match = cssRegCodeFrameRegex.exec(content);
      if (match) {
        content = match[1];
      }

      content = content
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();

      return content;
    } catch (error) {
      console.error("AI 生成 CSS 失败:", error);
      const inst = engine;
      if (inst) {
        try {
          await inst.unload();
        } catch {
          /* 已崩溃时 unload 可能再失败 */
        }
        engine = null;
      }
      return null;
    }
  });
}

export default aiGenCSS;

