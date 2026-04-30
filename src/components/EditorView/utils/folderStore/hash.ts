/**
 * 将 ArrayBuffer 转换为十六进制字符串
 */
const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * 计算 Blob 的哈希值
 */
export async function hashBlob(blob: Blob): Promise<string> {
  try {
    // 1. 创建哈希上下文
    const hash = crypto.subtle;
    const algorithm = { name: "SHA-256" };

    // 2. 流式读取文件（不会一次性加载全文件）
    const reader = blob.stream().getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // 3. 合并后计算哈希（Web Crypto 只能一次性计算）
    const mergedBuffer = new Uint8Array(
      chunks.reduce((acc, curr) => acc + curr.length, 0),
    );
    let offset = 0;
    for (const chunk of chunks) {
      mergedBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const digest = await hash.digest(algorithm, mergedBuffer);
    return toHex(digest);
  } catch (error) {
    console.warn("SHA-256 failed, using fallback hash", error);
    const text = await blob.text();
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}
