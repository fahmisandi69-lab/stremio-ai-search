/* eslint-disable no-console */
const assert = require("assert");

function getEnv(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === null || v === "" ? fallback : v;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { res, json };
}

async function main() {
  const baseUrl = getEnv("BASE_URL", "http://localhost:7000").replace(/\/+$/, "");

  let configId = getEnv("CONFIG_ID", "");
  const manifestUrl = getEnv("MANIFEST_URL", "");
  if (!configId) {
    if (manifestUrl && manifestUrl.includes("/aisearch/") && manifestUrl.endsWith("/manifest.json")) {
      configId = manifestUrl.split("/aisearch/")[1].split("/manifest.json")[0];
    }
  }

  // If no configId is provided, auto-create one using /aisearch/encrypt.
  if (!configId) {
    const aiProvider = getEnv("AI_PROVIDER", "openai-compat");
    const tmdbKey = getEnv("TMDB_API_KEY", "");
    assert(tmdbKey, "TMDB_API_KEY is required when CONFIG_ID is not provided");

    const configData = { AiProvider: aiProvider, TmdbApiKey: tmdbKey, NumResults: 5, EnableAiCache: false, EnableSimilar: true };
    if (aiProvider === "gemini") {
      configData.GeminiApiKey = getEnv("GEMINI_API_KEY", "");
      configData.GeminiModel = getEnv("GEMINI_MODEL", "gemini-2.5-flash-lite");
      assert(configData.GeminiApiKey, "GEMINI_API_KEY required for AI_PROVIDER=gemini");
    } else {
      configData.OpenAICompatApiKey = getEnv("OPENAI_COMPAT_API_KEY", "");
      configData.OpenAICompatModel = getEnv("OPENAI_COMPAT_MODEL", "");
      configData.OpenAICompatBaseUrl = getEnv("OPENAI_COMPAT_BASE_URL", "");
      assert(configData.OpenAICompatApiKey, "OPENAI_COMPAT_API_KEY required for AI_PROVIDER=openai-compat");
      assert(configData.OpenAICompatModel, "OPENAI_COMPAT_MODEL required for AI_PROVIDER=openai-compat");
    }

    const encryptUrl = `${baseUrl}/aisearch/encrypt`;
    const { res, json } = await postJson(encryptUrl, { configData, traktAuthData: null });
    assert(res.ok, `encrypt HTTP ${res.status}`);
    assert(json.encryptedConfig, "encryptedConfig missing");
    configId = json.encryptedConfig;
  }

  const query = getEnv("QUERY", "matrix");
  const type = getEnv("TYPE", "movie");
  const catalogId = getEnv("CATALOG_ID", "aisearch.top");

  const url = `${baseUrl}/aisearch/${configId}/catalog/${type}/${catalogId}/search=${encodeURIComponent(query)}.json`;

  console.log(`GET ${url}`);
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const json = await res.json();
  console.log(`HTTP ${res.status}`, { metas: json?.metas?.length });

  assert(res.ok, `HTTP ${res.status}`);
  assert(Array.isArray(json.metas), "metas must be an array");
  assert(json.metas.length > 0, "expected at least 1 meta result");
  assert(json.metas[0].id, "meta[0].id missing");
  assert(json.metas[0].name, "meta[0].name missing");

  console.log("Smoke catalog OK");
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
