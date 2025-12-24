const assert = require("assert");
const path = require("path");

function freshRequireAiProviderWithFetch(fetchImpl) {
  const modulePath = path.join(process.cwd(), "utils", "aiProvider.js");
  delete require.cache[require.resolve(modulePath)];
  const previousFetch = global.fetch;
  global.fetch = fetchImpl;
  const mod = require(modulePath);
  global.fetch = previousFetch;
  return mod;
}

function createCapturingFetch() {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return { choices: [{ message: { content: "ok" } }] };
      },
      async text() {
        return "";
      },
    };
  };
  return { fetch, calls };
}

async function testChatCompletionsUrl() {
  const { getOpenAIChatCompletionsUrl } = require("../utils/aiProvider");

  assert.equal(
    getOpenAIChatCompletionsUrl(""),
    "https://api.openai.com/v1/chat/completions"
  );
  assert.equal(
    getOpenAIChatCompletionsUrl("https://api.openai.com"),
    "https://api.openai.com/v1/chat/completions"
  );
  assert.equal(
    getOpenAIChatCompletionsUrl("https://openrouter.ai/api"),
    "https://openrouter.ai/api/v1/chat/completions"
  );
  assert.equal(
    getOpenAIChatCompletionsUrl("https://openrouter.ai/api/v1"),
    "https://openrouter.ai/api/v1/chat/completions"
  );
  assert.equal(
    getOpenAIChatCompletionsUrl("https://example.com/v1/chat/completions"),
    "https://example.com/v1/chat/completions"
  );
}

async function testTemperatureClamping() {
  const { getAiProviderConfigFromConfig } = require("../utils/aiProvider");

  assert.equal(
    getAiProviderConfigFromConfig({ AiProvider: "gemini", AiTemperature: 0 })
      .temperature,
    0
  );
  assert.equal(
    getAiProviderConfigFromConfig({ AiProvider: "gemini", AiTemperature: 2 })
      .temperature,
    1
  );
  assert.equal(
    getAiProviderConfigFromConfig({ AiProvider: "gemini", AiTemperature: -1 })
      .temperature,
    0
  );
  assert.equal(
    getAiProviderConfigFromConfig({ AiProvider: "gemini", AiTemperature: "0.7" })
      .temperature,
    0.7
  );
}

async function testOpenAICompatPayloadAndHeaders() {
  const { fetch, calls } = createCapturingFetch();
  const aiProvider = freshRequireAiProviderWithFetch(fetch);

  const config = aiProvider.getAiProviderConfigFromConfig({
    AiProvider: "openai-compat",
    OpenAICompatApiKey: "sk-test",
    OpenAICompatBaseUrl: "https://openrouter.ai/api",
    OpenAICompatModel: "openai/gpt-4o-mini",
    OpenAICompatExtraHeaders:
      '{"HTTP-Referer":"https://example.com","X-Title":"Stremio AI Search","Authorization":"NOPE","Content-Type":"nope"}',
    AiTemperature: 0,
  });

  const client = aiProvider.createAiTextGenerator(config);
  const text = await client.generateText("hello");
  assert.equal(text, "ok");

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://openrouter.ai/api/v1/chat/completions");

  const headers = calls[0].options.headers;
  assert.equal(headers.Authorization, "Bearer sk-test");
  assert.equal(headers["Content-Type"], "application/json");
  assert.equal(headers["HTTP-Referer"], "https://example.com");
  assert.equal(headers["X-Title"], "Stremio AI Search");
  // Forbidden overrides should be ignored
  assert.equal(headers.Authorization, "Bearer sk-test");
  assert.equal(headers["Content-Type"], "application/json");

  const payload = JSON.parse(calls[0].options.body);
  assert.equal(payload.model, "openai/gpt-4o-mini");
  assert.equal(payload.temperature, 0);
  assert.equal(payload.max_tokens, 800);
  assert.deepEqual(payload.messages, [{ role: "user", content: "hello" }]);
}

async function testOpenAICompatExtraHeadersInvalidJson() {
  const { fetch } = createCapturingFetch();
  const aiProvider = freshRequireAiProviderWithFetch(fetch);

  const config = aiProvider.getAiProviderConfigFromConfig({
    AiProvider: "openai-compat",
    OpenAICompatApiKey: "sk-test",
    OpenAICompatModel: "gpt-4o-mini",
    OpenAICompatExtraHeaders: "{not-json}",
  });

  const client = aiProvider.createAiTextGenerator(config);
  await assert.rejects(
    () => client.generateText("hello"),
    (err) => err && err.status === 400
  );
}

module.exports.run = async function run() {
  await testChatCompletionsUrl();
  await testTemperatureClamping();
  await testOpenAICompatPayloadAndHeaders();
  await testOpenAICompatExtraHeadersInvalidJson();
};

