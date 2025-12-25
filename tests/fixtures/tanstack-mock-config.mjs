export function createOpenaiChat(model, apiKey, config) {
  return { kind: "openai", model, apiKey, config };
}

export function createGeminiChat(model, apiKey, config) {
  return { kind: "gemini", model, apiKey, config };
}

export async function streamToText(stream) {
  let out = "";
  for await (const chunk of stream) {
    if (chunk && chunk.type === "content" && chunk.delta) out += chunk.delta;
  }
  return out;
}

export function chat(options) {
  const { adapter, model } = options || {};
  async function* run() {
    const payload = {
      kind: adapter?.kind || "mock",
      model,
      adapterModel: adapter?.model,
      apiKey: adapter?.apiKey,
      baseUrl: adapter?.config?.baseUrl || adapter?.config?.baseURL || null,
      headers: adapter?.config?.headers || null,
    };
    yield { type: "content", delta: JSON.stringify(payload) };
  }
  return run();
}
