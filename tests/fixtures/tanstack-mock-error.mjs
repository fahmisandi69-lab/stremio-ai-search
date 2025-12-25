export function createOpenaiChat(model, apiKey, config) {
  return { kind: "openai", model, apiKey, config };
}

export function createGeminiChat(model, apiKey, config) {
  return { kind: "gemini", model, apiKey, config };
}

export async function streamToText(stream) {
  throw new Error("tanstack stream failure");
}

export function chat() {
  async function* run() {
    yield { type: "content", delta: "ignored" };
  }
  return run();
}
