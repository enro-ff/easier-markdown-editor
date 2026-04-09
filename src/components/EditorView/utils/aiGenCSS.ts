import { MLCEngine, type ChatCompletionMessageParam } from "@mlc-ai/web-llm";

let engine: MLCEngine | null = null;
const modelId = "Qwen3-1.7B-q4f16_1-MLC";

async function getEngine() {
  if (engine) return engine;
  
  engine = new MLCEngine();
  engine.setInitProgressCallback((report) => {
    console.log(`[进度] ${report.text}`);
  });

  console.log(`正在加载模型 ${modelId} ...`);
  await engine.reload(modelId, { temperature: 0.7, top_p: 0.9 });
  return engine;
}

async function aiGenCSS(prompt: string) {
  try {
    const engineInstance = await getEngine();

    // 5. 发送消息并获取回复
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
                  /nothink
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
      enable_thinking: false,
    });

    let content = reply.choices[0].message.content || "";
    console.log(`AI: `,reply);

    // 清理可能的代码块包裹
    const cssRegCodeFrameRegex = /```(?:css|)\n?([\s\S]*?)(?:```|$)/i;
    const match = cssRegCodeFrameRegex.exec(content);
    if (match) {
      content = match[1];
    }

    // 移除结束标志
    content = content.replace(`<think>`, "").trim();
    content = content.replace(`</think>`, "").trim();

    return content;
  } catch (error) {
    console.error("AI 生成 CSS 失败:", error);
    return null;
  }
}

export default aiGenCSS;
